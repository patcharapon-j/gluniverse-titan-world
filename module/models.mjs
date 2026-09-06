import {STATS} from './rules.mjs';
export function registerModels() {
  const f=foundry.data.fields;
  const number=(initial=0,extra={})=>new f.NumberField({required:true,nullable:false,initial,...extra});
  const string=(initial='',extra={})=>new f.StringField({required:true,nullable:false,initial,...extra});
  const bool=(initial=false)=>new f.BooleanField({initial});
  class SoldierData extends foundry.abstract.TypeDataModel {
    static defineSchema() { return {
      stats:new f.SchemaField(Object.fromEntries(Object.keys(STATS).map(k=>[k,number(0,{integer:true,min:-3,max:3})]))),
      regiment:string('Survey Corps'),rank:string('Recruit'),origin:string(),anchor:string(),drive:string(),background:string(),
      consciousness:new f.SchemaField({loss:number(),titanLoss:number(),maxAdjustment:number(),titanMaxAdjustment:number()}),fatigue:number(0,{min:0,integer:true}),
      nextDifficult:bool(),dead:bool(),height:number(1.7,{min:0}),notes:string(),
      advanced:new f.SchemaField(Object.fromEntries(Object.keys(STATS).map(k=>[k,bool()]))),
      shift:new f.SchemaField({active:bool(),experienced:bool(),armourIntact:bool(true),weak:bool(),absorption:number(0,{min:0,integer:true}),yearsRemaining:number(13,{min:0}),notes:string()}),
      luck:new f.SchemaField({value:number(0,{min:0,integer:true}),max:number(0,{min:0,integer:true})})
    }; }
  }
  class TitanItemData extends foundry.abstract.TypeDataModel {
    static defineSchema() {return {
      description:new f.HTMLField({initial:''}),source:string(),key:string(),category:string(),
      stat:string('technique',{choices:Object.keys(STATS)}),difficult:bool(),combat:bool(),
      success:string(),partial:string(),failure:string(),snakeEyes:string(),doubleSix:string(),
      quantity:number(1,{min:0,integer:true}),uses:number(0,{min:0,integer:true}),equipped:bool(true),
      bonusStat:string(),bonus:number(),loadout:string(),
      region:string('chest',{choices:['head','chest','leftArm','rightArm','leftLeg','rightLeg']}),
      severity:string('minor',{choices:['minor','major','crippling']}),
      injuryType:string('blunt',{choices:['blunt','cutting','piercing','burn']}),
      consciousnessLoss:number(0,{min:0}),treated:bool(),healed:bool(),fromMajor:bool(),formScope:string('human',{choices:['human','titan']})
    };}
  }
  for(const type of ['soldier','titan','party']) CONFIG.Actor.dataModels[type]=SoldierData;
  for(const type of ['gear','move','power','wound','loadout','advancement']) CONFIG.Item.dataModels[type]=TitanItemData;
}
