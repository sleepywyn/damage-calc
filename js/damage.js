function CALCULATE_ALL_MOVES_LGPE(p1, p2, field) {
	checkStatBoost(p1, p2);
	p1.stats[DF] = getModifiedStat(p1.rawStats[DF], p1.boosts[DF]);
	p1.stats[SD] = getModifiedStat(p1.rawStats[SD], p1.boosts[SD]);
	p1.stats[SP] = getFinalSpeed(p1, field.getWeather());
	p2.stats[DF] = getModifiedStat(p2.rawStats[DF], p2.boosts[DF]);
	p2.stats[SD] = getModifiedStat(p2.rawStats[SD], p2.boosts[SD]);
	p2.stats[SP] = getFinalSpeed(p2, field.getWeather());
	p1.stats[AT] = getModifiedStat(p1.rawStats[AT], p1.boosts[AT]);
	p1.stats[SA] = getModifiedStat(p1.rawStats[SA], p1.boosts[SA]);
	p2.stats[AT] = getModifiedStat(p2.rawStats[AT], p2.boosts[AT]);
	p2.stats[SA] = getModifiedStat(p2.rawStats[SA], p2.boosts[SA]);
	var side1 = field.getSide(1);
	var side2 = field.getSide(0);
	var results = [[], []];
	for (var i = 0; i < 4; i++) {
		results[0][i] = getLGPEDamageResult(p1, p2, p1.moves[i], side1);
		results[1][i] = getLGPEDamageResult(p2, p1, p2.moves[i], side2);
	}
	return results;
}

function CALCULATE_MOVES_OF_ATTACKER_LGPE(attacker, defender, field) {
	attacker.stats[SP] = getFinalSpeed(attacker, field.getWeather());
	defender.stats[DF] = getModifiedStat(defender.rawStats[DF], defender.boosts[DF]);
	defender.stats[SD] = getModifiedStat(defender.rawStats[SD], defender.boosts[SD]);
	defender.stats[SP] = getFinalSpeed(defender, field.getWeather());
	attacker.stats[AT] = getModifiedStat(attacker.rawStats[AT], attacker.boosts[AT]);
	attacker.stats[SA] = getModifiedStat(attacker.rawStats[SA], attacker.boosts[SA]);
	defender.stats[AT] = getModifiedStat(defender.rawStats[AT], defender.boosts[AT]);
	var defenderSide = field.getSide(~~(mode === "one-vs-all"));
	var results = [];
	for (var i = 0; i < 4; i++) {
		results[i] = getLGPEDamageResult(attacker, defender, attacker.moves[i], defenderSide);
	}
	return results;
}

function getLGPEDamageResult(attacker, defender, move, field) {
	var description = {
		"attackerName": attacker.name,
		"moveName": move.name,
		"defenderName": defender.name
	};

	if (move.bp === 0) {
		return {"damage": [0], "description": buildLGPEDescription(description)};
	}

	if (field.isProtected && !move.bypassesProtect) {
		description.isProtected = true;
		return {"damage": [0], "description": buildLGPEDescription(description)};
	}

	var isCritical = move.isCrit;

	if (move.name === "Weather Ball") {
		move.type = field.weather.indexOf("Sun") !== -1 ? "Fire" :
			field.weather.indexOf("Rain") !== -1 ? "Water" :
				field.weather === "Sand" ? "Rock" :
					field.weather === "Hail" ? "Ice" :
						"Normal";
		description.weather = field.weather;
		description.moveType = move.type;
	} else if (move.name === "Nature Power") {
		move.type = field.terrain === "Electric" ? "Electric" : field.terrain === "Grassy" ? "Grass" : field.terrain === "Misty" ? "Fairy" : field.terrain === "Psychic" ? "Psychic" : "Normal";
	} else if (move.name === "Revelation Dance") {
		move.type = attacker.type1;
	}

	var typeEffect1 = getMoveEffectiveness(move, defender.type1, field.isForesight, field.isGravity);
	var typeEffect2 = defender.type2 ? getMoveEffectiveness(move, defender.type2, field.isForesight, field.isGravity) : 1;
	var typeEffectiveness = typeEffect1 * typeEffect2;
	
	if (typeEffectiveness === 0 && move.name === "Thousand Arrows") {
		typeEffectiveness = 1;
	}
	if (typeEffectiveness === 0) {
		return {"damage": [0], "description": buildLGPEDescription(description)};
	}
	if (move.name === "Sky Drop" && (defender.hasType("Flying") || defender.weight >= 200 || field.isGravity)) {
		return {"damage": [0], "description": buildLGPEDescription(description)};
	}
	if (move.name === "Synchronoise" && !defender.hasType(attacker.type1) &&
            (!attacker.type2 || !defender.hasType(attacker.type2))) {
		return {"damage": [0], "description": buildLGPEDescription(description)};
	}
	if (field.weather === "Strong Winds" && (defender.hasType("Flying") && typeChart[move.type]["Flying"] > 1)) {
		typeEffectiveness /= 2;
		description.weather = field.weather;
	}
	if (move.type === "Ground" && move.name !== "Thousand Arrows" && !field.isGravity) {
		description.defenderItem = defender.item;
		return {"damage": [0], "description": buildLGPEDescription(description)};
	}
	if (move.hasPriority && field.terrain === "Psychic" && isGroundedForCalc(defender, field)) {
		description.terrain = field.terrain;
		return {"damage": [0], "description": buildLGPEDescription(description)};
	}

	description.HPAVs = defender.HPAVs + " HP";

	if (["Seismic Toss", "Night Shade"].indexOf(move.name) !== -1) {
		var lv = attacker.level;
		return {"damage": [lv], "description": buildLGPEDescription(description)};
	}

	if (move.name === "Final Gambit") {
		var hp = attacker.curHP;
		return {"damage": [hp], "description": buildLGPEDescription(description)};
	}

	if (move.hits > 1) {
		description.hits = move.hits;
	}

	var turnOrder = attacker.stats[SP] > defender.stats[SP] ? "FIRST" : "LAST";

	////////////////////////////////
	////////// BASE POWER //////////
	////////////////////////////////
	var basePower;

	switch (move.name) {
	case "Payback":
		basePower = turnOrder === "LAST" ? 100 : 50;
		description.moveBP = basePower;
		break;
	case "Electro Ball":
		var r = Math.floor(attacker.stats[SP] / defender.stats[SP]);
		basePower = r >= 4 ? 150 : r >= 3 ? 120 : r >= 2 ? 80 : 60;
		description.moveBP = basePower;
		break;
	case "Gyro Ball":
		basePower = Math.min(150, Math.floor(25 * defender.stats[SP] / attacker.stats[SP]));
		description.moveBP = basePower;
		break;
	case "Punishment":
		basePower = Math.min(200, 60 + 20 * countBoosts(defender.boosts));
		description.moveBP = basePower;
		break;
	case "Low Kick":
	case "Grass Knot":
		var w = defender.weight * getWeightFactor(defender);
		basePower = w >= 200 ? 120 : w >= 100 ? 100 : w >= 50 ? 80 : w >= 25 ? 60 : w >= 10 ? 40 : 20;
		description.moveBP = basePower;
		break;
	case "Hex":
		basePower = move.bp * (defender.status !== "Healthy" ? 2 : 1);
		description.moveBP = basePower;
		break;
	case "Heavy Slam":
	case "Heat Crash":
		var wr = attacker.weight * getWeightFactor(attacker) / (defender.weight * getWeightFactor(defender));
		basePower = wr >= 5 ? 120 : wr >= 4 ? 100 : wr >= 3 ? 80 : wr >= 2 ? 60 : 40;
		description.moveBP = basePower;
		break;
	case "Stored Power":
	case "Power Trip":
		basePower = 20 + 20 * countBoosts(attacker.boosts);
		description.moveBP = basePower;
		break;
	case "Wake-Up Slap":
		basePower = move.bp * (defender.status === "Asleep" ? 2 : 1);
		description.moveBP = basePower;
		break;
	case "Weather Ball":
		basePower = (field.weather !== "" && field.weather !== "Delta Stream") ? 100 : 50;
		description.moveBP = basePower;
		break;
	case "Eruption":
	case "Water Spout":
		basePower = Math.max(1, Math.floor(150 * attacker.curHP / attacker.maxHP));
		description.moveBP = basePower;
		break;
	case "Flail":
	case "Reversal":
		var p = Math.floor(48 * attacker.curHP / attacker.maxHP);
		basePower = p <= 1 ? 200 : p <= 4 ? 150 : p <= 9 ? 100 : p <= 16 ? 80 : p <= 32 ? 40 : 20;
		description.moveBP = basePower;
		break;
	case "Nature Power":
		basePower = ["Electric", "Grassy", "Psychic"].indexOf(field.terrain) !== -1 ? 90 : (field.terrain === "Misty") ? 95 : 80;
		//console.log("A " + field.terrain + " terrain " + move.type + move.name + " with " + move.bp + " base power " + " agaisnt a(n) " + defender.name + " that has " + defender.type1 + " " + defender.type2 + " typing");
		break;
	case "Wring Out":
		basePower = Math.max(1, Math.ceil(defender.curHP * 120 / defender.maxHP - 0.5));
		description.moveBP = basePower;
		break;
	default:
		basePower = move.bp;
	}
	var bpMods = [];
	var isSTAB = attacker.hasType(move.type);

	if ((move.name === "Facade" && ["Burned", "Paralyzed", "Poisoned", "Badly Poisoned"].indexOf(attacker.status) !== -1) ||
            (move.name === "Brine" && defender.curHP <= defender.maxHP / 2) ||
            (move.name === "Venoshock" && (defender.status === "Poisoned" || defender.status === "Badly Poisoned"))) {
		bpMods.push(0x2000);
		description.moveBP = move.bp * 2;
	} else if (move.name === "Solar Beam" && ["Rain", "Heavy Rain", "Sand", "Hail"].indexOf(field.weather) !== -1) {
		bpMods.push(0x800);
		description.moveBP = move.bp / 2;
		description.weather = field.weather;
	}

	if (field.isHelpingHand) {
		bpMods.push(0x1800);
		description.isHelpingHand = true;
	}

	basePower = Math.max(1, pokeRound(basePower * chainMods(bpMods) / 0x1000));

	////////////////////////////////
	////////// (SP)ATTACK //////////
	////////////////////////////////
	var attack;
	var attackSource = move.name === "Foul Play" ? defender : attacker;
	if (move.usesHighestAttackStat) {
		move.category = attackSource.stats[AT] > attackSource.stats[SA] ? "Physical" : "Special";
	}
	var attackStat = move.category === "Physical" ? AT : SA;
	description.attackAVs = attacker.avs[attackStat] +
            (NATURES[attacker.nature][0] === attackStat ? "+" : NATURES[attacker.nature][1] === attackStat ? "-" : "") + " " +
            toSmogonStat(attackStat);
	if (attackSource.boosts[attackStat] === 0 || (isCritical && attackSource.boosts[attackStat] < 0)) {
		attack = attackSource.rawStats[attackStat];
	} else if (defAbility === "Unaware") {
		attack = attackSource.rawStats[attackStat];
		description.defenderAbility = defAbility;
	} else {
		attack = attackSource.stats[attackStat];
		description.attackBoost = attackSource.boosts[attackStat];
	}

	var atMods = [];
	attack = Math.max(1, pokeRound(attack * chainMods(atMods) / 0x1000));

	////////////////////////////////
	///////// (SP)DEFENSE //////////
	////////////////////////////////
	var defense;
	var hitsPhysical = move.category === "Physical" || move.dealsPhysicalDamage;
	var defenseStat = hitsPhysical ? DF : SD;
	description.defenseAVs = defender.avs[defenseStat] +
            (NATURES[defender.nature][0] === defenseStat ? "+" : NATURES[defender.nature][1] === defenseStat ? "-" : "") + " " +
            toSmogonStat(defenseStat);
	if (defender.boosts[defenseStat] === 0 || (isCritical && defender.boosts[defenseStat] > 0) || move.ignoresDefenseBoosts) {
		defense = defender.rawStats[defenseStat];
	} else {
		defense = defender.stats[defenseStat];
		description.defenseBoost = defender.boosts[defenseStat];
	}

	// unlike all other defense modifiers, Sandstorm SpD boost gets applied directly
	if (field.weather === "Sand" && defender.hasType("Rock") && !hitsPhysical) {
		defense = pokeRound(defense * 3 / 2);
		description.weather = field.weather;
	}

	var dfMods = [];

	defense = Math.max(1, pokeRound(defense * chainMods(dfMods) / 0x1000));

	////////////////////////////////
	//////////// DAMAGE ////////////
	////////////////////////////////
	var baseDamage = getBaseDamage(attacker.level, basePower, attack, defense);
	if (field.format !== "Singles" && move.isSpread) {
		baseDamage = pokeRound(baseDamage * 0xC00 / 0x1000);
	}
	if ((field.weather.indexOf("Sun") !== -1 && move.type === "Fire") || (field.weather.indexOf("Rain") !== -1 && move.type === "Water")) {
		baseDamage = pokeRound(baseDamage * 0x1800 / 0x1000);
		description.weather = field.weather;
	} else if ((field.weather === "Sun" && move.type === "Water") || (field.weather === "Rain" && move.type === "Fire")) {
		baseDamage = pokeRound(baseDamage * 0x800 / 0x1000);
		description.weather = field.weather;
	} else if ((field.weather === "Harsh Sunshine" && move.type === "Water") || (field.weather === "Heavy Rain" && move.type === "Fire")) {
		return {"damage": [0], "description": buildLGPEDescription(description)};
	}
	if (isGroundedForCalc(attacker, field)) {
		if (field.terrain === "Electric" && move.type === "Electric") {
			baseDamage = pokeRound(baseDamage * 0x1800 / 0x1000);
			description.terrain = field.terrain;
		} else if (field.terrain === "Grassy" && move.type === "Grass") {
			baseDamage = pokeRound(baseDamage * 0x1800 / 0x1000);
			description.terrain = field.terrain;
		} else if (field.terrain === "Psychic" && move.type === "Psychic") {
			baseDamage = pokeRound(baseDamage * 0x1800 / 0x1000);
			description.terrain = field.terrain;
		}
	}
	if (isGroundedForCalc(defender, field)) {
		if (field.terrain === "Misty" && move.type === "Dragon") {
			baseDamage = pokeRound(baseDamage * 0x800 / 0x1000);
			description.terrain = field.terrain;
		} else if (field.terrain === "Grassy" && ["Bulldoze", "Earthquake"].indexOf(move.name) !== -1) {
			baseDamage = pokeRound(baseDamage * 0x800 / 0x1000);
			description.terrain = field.terrain;
		}
	}
	if (isCritical) {
		baseDamage = Math.floor(baseDamage * 1.5);
		description.isCritical = isCritical;
	}
	// the random factor is applied between the crit mod and the stab mod, so don't apply anything below this until we're inside the loop
	var stabMod = 0x1000;
	if (isSTAB) {
			stabMod = 0x1800;
	}
	var applyBurn = (attacker.status === "Burned" && move.category === "Physical" && !move.ignoresBurn);
	description.isBurned = applyBurn;
	var finalMods = [];
	if (field.isReflect && move.category === "Physical" && !isCritical) {
		finalMods.push(field.format !== "Singles" ? 0xAAC : 0x800);
		description.isReflect = true;
	} else if (field.isLightScreen && move.category === "Special" && !isCritical) {
		finalMods.push(field.format !== "Singles" ? 0xAAC : 0x800);
		description.isLightScreen = true;
	}

	var damage = [];
	for (var i = 0; i < 16; i++) {
		damage[i] = getFinalDamage(baseDamage, i, typeEffectiveness, applyBurn, stabMod, finalMods);
			damage[i] = Math.floor(damage[i]);
		}
	}

function toSmogonStat(stat) {
	return stat === AT ? "Atk" :
		stat === DF ? "Def" :
			stat === SA ? "SpA" :
				stat === SD ? "SpD" :
					stat === SP ? "Spe" :
						"wtf";
}

function chainMods(mods) {
	var M = 0x1000;
	for (var i = 0; i < mods.length; i++) {
		if (mods[i] !== 0x1000) {
			M = ((M * mods[i]) + 0x800) >> 12;
		}
	}
	return M;
}

function getMoveEffectiveness(move, type, isGhostRevealed, isGravity) {
	if (isGhostRevealed && type === "Ghost" && ["Normal", "Fighting"].indexOf(move.type) !== -1) {
		return 1;
	} else if (isGravity && type === "Flying" && move.type === "Ground") {
		return 1;
	} else if (move.name === "Freeze-Dry" && type === "Water") {
		return 2;
	} else if (move.name === "Flying Press") {
		return typeChart["Fighting"][type] * typeChart["Flying"][type];
	} else {
		return typeChart[move.type][type];
	}
}

function getModifiedStat(stat, mod) {
	return mod > 0 ? Math.floor(stat * (2 + mod) / 2) :
		mod < 0 ? Math.floor(stat * 2 / (2 - mod)) :
			stat;
}

function getFinalSpeed(pokemon, weather) {
	var speed = getModifiedStat(pokemon.rawStats[SP], pokemon.boosts[SP]);
	return speed;
}

function checkStatBoost(p1, p2) {
	if ($('#StatBoostL').prop("checked")) {
		for (var stat in p1.boosts) {
			p1.boosts[stat] = Math.min(6, p1.boosts[stat] + 1);
		}
	}
	if ($('#StatBoostR').prop("checked")) {
		for (var stat in p2.boosts) {
			p2.boosts[stat] = Math.min(6, p2.boosts[stat] + 1);
		}
	}
}

function countBoosts(boosts) {
	var sum = 0;
	for (var i = 0; i < STATS.length; i++) {
		if (boosts[STATS[i]] > 0) {
			sum += boosts[STATS[i]];
		}
	}
	return sum;
}

function isGroundedForCalc(pokemon, field) {
	return field.isGravity || !pokemon.hasType("Flying");
}

// GameFreak rounds DOWN on .5
function pokeRound(num) {
	return (num % 1 > 0.5) ? Math.ceil(num) : Math.floor(num);
}

function getBaseDamage(level, basePower, attack, defense) {
	return Math.floor(Math.floor((Math.floor((2 * level) / 5 + 2) * basePower * attack) / defense) / 50 + 2);
}

function getFinalDamage(baseAmount, i, effectiveness, isBurned, stabMod, finalMod) {
	var damageAmount = Math.floor(
		pokeRound(Math.floor(baseAmount * (85 + i) / 100) * stabMod / 0x1000) * effectiveness

	);
	if (isBurned) {
		damageAmount = Math.floor(damageAmount / 2);
	}
	return pokeRound(Math.max(1, damageAmount * finalMod / 0x1000));
}

function buildLGPEDescription(description) {
	var output = "";
	if (description.attackBoost) {
		if (description.attackBoost > 0) {
			output += "+";
		}
		output += description.attackBoost + " ";
	}
	output = appendIfSet(output, description.attackAVs);
	if (description.isBurned) {
		output += "burned ";
	}
	output += description.attackerName + " ";
	if (description.isHelpingHand) {
		output += "Helping Hand ";
	}
	output += description.moveName + " ";
	if (description.moveBP && description.moveType) {
		output += "(" + description.moveBP + " BP " + description.moveType + ") ";
	} else if (description.moveBP) {
		output += "(" + description.moveBP + " BP) ";
	} else if (description.moveType) {
		output += "(" + description.moveType + ") ";
	}
	if (description.hits) {
		output += "(" + description.hits + " hits) ";
	}
	output = appendIfSet(output, description.moveTurns);
	output += "vs. ";
	if (description.defenseBoost) {
		if (description.defenseBoost > 0) {
			output += "+";
		}
		output += description.defenseBoost + " ";
	}
	output = appendIfSet(output, description.HPAVs);
	if (description.defenseAVs) {
		output += " / " + description.defenseAVs + " ";
	}
	if (description.isProtected) {
		output += "protected ";
	}
	output += description.defenderName;
	if (!description.weather && description.terrain) {
		// do nothing
	} else if (description.weather) {
		output += " in " + description.weather;
	} else if (description.terrain) {
		output += " in " + description.terrain + " Terrain";
	}
	if (description.isReflect) {
		output += " through Reflect";
	} else if (description.isLightScreen) {
		output += " through Light Screen";
	}
	if (description.isCritical) {
		output += " on a critical hit";
	}
	return output;
}
