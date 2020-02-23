import {Category, getZMoveName, getMaxMoveName, MoveData, MOVES, Recoil} from './data/moves';
import {Type} from './data/types';
import {Generation} from './gen';
import {extend} from './util';

export class Move {
  gen: Generation;
  name: string;

  originalName: string;
  ability?: string;
  item?: string;
  species?: string;
  useZ?: boolean;
  useMax?: boolean;
  overrides?: Partial<MoveData>;
// a move might have multiple traits so it is reasonable to make them properities?
// we might make them interfaces.
  hits: number;
  usedTimes?: number;
  metronomeCount?: number;
  bp: number;           // base power
  type: Type;
  category: Category;   // 'Physical' | 'Special' | 'Status'
  hasSecondaryEffect: boolean;
  isSpread: boolean | 'allAdjacent';
  makesContact: boolean;  
  hasRecoil?: Recoil;   // 畏缩
  isCrit: boolean;      // 致命一击
  givesHealth: boolean; // 补血
  percentHealed?: number;
  ignoresBurn: boolean;
  isPunch: boolean;     // punch move: e.g. thunder punch
  isBite: boolean;      // bite move:  e.g. Bite, Crunch, Ice Fang
  isBullet: boolean;    // bullet move: e.g. Bullet Punch
  isSound: boolean;     // sound move: e.g. Hyper Voice, Perish Song
  isPulse: boolean;     // pulse move: e.g. dragon pulse
  hasPriority: boolean; // always goes first?
  dropsStats?: number;  // ？？？why number?
  ignoresDefenseBoosts: boolean;
  dealsPhysicalDamage: boolean;
  bypassesProtect: boolean;
  isZ: boolean;
  isMax: boolean;
  usesHighestAttackStat: boolean;

  constructor(
    gen: Generation,
    name: string,
    options: {
      ability?: string;
      item?: string;
      species?: string;
      useZ?: boolean;
      useMax?: boolean;
      isCrit?: boolean;
      hits?: number;
      usedTimes?: number;
      metronomeCount?: number;
      overrides?: Partial<MoveData>;
    } = {}
  ) {
    this.originalName = name;
    let data: MoveData & {name: string} = extend(true, {name}, MOVES[gen][name], options.overrides);

    // If isZMove but there isn't a corresponding z-move, use the original move
    if (options.useMax && 'maxPower' in data) {
      const maxMoveName: string = getMaxMoveName(
        data.type,
        options.species,
        !!(data.category === 'Status')
      );
      const maxMove = MOVES[gen][maxMoveName];
      const maxMoveBasePower = (move: MoveData) => {
        let movePower = 10;       // dynamax move calculation!
        if (move.maxPower) movePower = move.maxPower; // move that has a preset maxPower
        if (!move.maxPower && move.category !== 'Status') { // if the move is not status move (purely raise or reduce status)
          if (!move.bp) {
            movePower = 100;      // if move does not have a base power, set it to 100
          } else if (move.type === 'Fighting' || move.type === 'Poison') {
            if (move.bp >= 150) { // fighting or poison move deals less damage because their negative effects are removed
              movePower = 100;
            } else if (move.bp >= 110) {
              movePower = 95;
            } else if (move.bp >= 75) {
              movePower = 90;
            } else if (move.bp >= 65) {
              movePower = 85;
            } else if (move.bp >= 55) {
              movePower = 80;
            } else if (move.bp >= 45) {
              movePower = 75;
            } else {
              movePower = 70;
            }
          } else {
            if (move.bp >= 150) {  
              movePower = 150;        // power 150 move stays the same while removing negative effects
            } else if (move.bp >= 110) {  // normally, move power is increased
              movePower = 140;
            } else if (move.bp >= 75) {
              movePower = 130;
            } else if (move.bp >= 65) {
              movePower = 120;
            } else if (move.bp >= 55) {   // power 55 and 45 move have the greatest potential after dynamaxing  
              movePower = 110;
            } else if (move.bp >= 45) {
              movePower = 100;
            } else {                      // even power 20 move becomes power 90
              movePower = 90;
            }
          }
        }
        return movePower;
      };
      data = extend(true, {}, maxMove, {   // bp === 10 means it is a max move (please refer to the move data)
        name: maxMoveName,
        bp: maxMove.bp === 10 ? maxMoveBasePower(data) : maxMove.bp,
        category: data.category,
      });
      this.hits = 1;
    }
    if (options.useZ && 'zp' in data) {
      const zMoveName: string = getZMoveName(data.name, data.type, options.item);
      const zMove = MOVES[gen][zMoveName];
      data = extend(true, {}, zMove, {
        name: zMoveName,
        bp: zMove.bp === 1 ? data.zp : zMove.bp,
        category: data.category,
      });
      this.hits = 1;
    } else {
      this.hits = data.isMultiHit
        ? options.hits || (options.ability === 'Skill Link' || options.item === 'Grip Claw' ? 5 : 3)
        : data.isTwoHit
        ? 2
        : 1;
      this.metronomeCount = options.metronomeCount;
    }
    this.usedTimes = (data.dropsStats && options.usedTimes) || 1;

    this.gen = gen;
    this.name = data.name;
    this.ability = options.ability;
    this.item = options.item;
    this.useZ = options.useZ;
    this.useMax = options.useMax;
    this.overrides = options.overrides;

    this.bp = data.bp;
    this.type = data.type;
    this.category = data.category || 'Status';
    this.hasSecondaryEffect = !!data.hasSecondaryEffect;
    this.isSpread = data.isSpread === 'allAdjacent' ? data.isSpread : !!data.isSpread;
    this.makesContact = !!data.makesContact;
    this.hasRecoil = data.hasRecoil;
    this.isCrit = !!options.isCrit || !!data.alwaysCrit;
    this.givesHealth = !!data.givesHealth;
    this.percentHealed = data.percentHealed;
    this.ignoresBurn = !!data.ignoresBurn;
    this.isPunch = !!data.isPunch;
    this.isBite = !!data.isBite;
    this.isBullet = !!data.isBullet;
    this.isSound = !!data.isSound;
    this.isPulse = !!data.isPulse;
    this.hasPriority = !!data.hasPriority;
    this.dropsStats = data.dropsStats;
    this.ignoresDefenseBoosts = !!data.ignoresDefenseBoosts;
    this.dealsPhysicalDamage = !!data.dealsPhysicalDamage;
    this.bypassesProtect = !!data.bypassesProtect;
    this.isZ = !!data.isZ;
    this.isMax = !!data.isMax;
    this.usesHighestAttackStat = !!data.usesHighestAttackStat;
  }

  clone() {
    return new Move(this.gen, this.originalName, {
      ability: this.ability,
      item: this.item,
      species: this.species,
      useZ: this.useZ,
      useMax: this.useMax,
      isCrit: this.isCrit,
      hits: this.hits,
      usedTimes: this.usedTimes,
      metronomeCount: this.metronomeCount,
      overrides: this.overrides,
    });
  }
}
