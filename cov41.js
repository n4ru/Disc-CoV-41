const request = require('request-promise-native'),
    Discord = require('discord.js'),
    fluidb = new require('fluidb'),
    db = new fluidb('cov'),
    client = new Discord.Client();

if (JSON.stringify(db) == "{}") {
    db.infected = 0;
    db.symptomatic = 0;
    db.critical = 0;
    db.dead = 0;
    db.recovered = 0;
    db.recoveries = {};
}

const config = {
    // Server
    "guild": "374618469595086848",
    // Auth token for the bot
    'token': "token",
    // Chance of Infection
    'infectionChance': 0.1,
    // Chance of Infection Upgrade
    'upgradeChance': {
        "asymp": 0.125, // 12 trials = 80%
        "symp": 0.006, // 36 trials = 20%
        "critical": 0.056 // 24 trials = 25%
    },
    // Chance of Recovery
    'recovChance': 0.022, // 72 trials = 80%
    // Infection Roles (Symp, Critical, Dead, Recovered)
    'roles': {
        "symp": "695054305270431774",
        "critical": "695054558338089021",
        "dead": "695054673035395092",
        "recov": "695055633723949126"
    },
    // Quarantine Role
    'quarantine': "695067619484500019"
}


client.login(config.token);

client.on('ready', () => {
    console.log(`Coronavirus loaded!\n Currently infected: ${db.infected}\n Currently Symptomatic: ${db.symptomatic}\n Currently Critical: ${db.critical}\n Currently Dead: ${db.dead}\n Currently Recovered: ${db.recovered}`);

    roll();

    setInterval(() => {
        // Don't let people clear roles
        Object.keys(db.infections).forEach(member => {
            switch (db.infections[member]) {
                case 2:
                    client.guilds.get(config.guild).members.get(member).addRole(config.roles.symp); // Make sure they always have the role
                    break;
                case 3:
                    client.guilds.get(config.guild).members.get(member).addRole(config.roles.critical); // Make sure they always have the role
                    break;
                case 4:
                    client.guilds.get(config.guild).members.get(member).addRole(config.roles.dead); // Make sure they always have the role
                    break;
            }
        })
        Object.keys(db.recoveries).forEach(member => client.guilds.get(config.guild).members.get(member).addRole(config.roles.recov));
    }, 5000)

    // Roll every 5 minutes
    setInterval(roll, 5 * 60 * 1000)

});

const roll = () => {
    Object.keys(db.infections).forEach(member => {
        let chance = Math.random();
        let rChance = Math.random();
        // Infection Upgrade or cure
        switch (db.infections[member]) {
            case 1:
                if (chance < config.upgradeChance.asymp) { // Infection Upgrade?
                    db.infections[member]++;
                    db.symptomatic++;
                    client.guilds.get(config.guild).members.get(member).addRole(config.roles.symp);
                    console.log(`${client.guilds.get(config.guild).members.get(member).user.tag} has become symptomatic.`);
                } else if (rChance < config.recovChance) { // Recovery?
                    db.recoveries[member] = true;
                    db.recovered++;
                    db.infected--;
                    delete db.infections[member];
                    client.guilds.get(config.guild).members.get(member).addRole(config.roles.recov)
                    console.log(`${client.guilds.get(config.guild).members.get(member).user.tag} has recovered.`);
                }
                break;
            case 2:
                if (chance < config.upgradeChance.symp) { // Infection Upgrade?
                    db.infections[member]++;
                    db.critical++;
                    client.guilds.get(config.guild).members.get(member).removeRole(config.roles.symp);
                    client.guilds.get(config.guild).members.get(member).addRole(config.roles.critical);
                    console.log(`${client.guilds.get(config.guild).members.get(member).user.tag} has become critical.`);
                } else if (rChance < config.recovChance) { // Recovery?
                    db.recoveries[member] = true;
                    db.symptomatic--;
                    db.recovered++;
                    db.infected--;
                    delete db.infections[member];
                    client.guilds.get(config.guild).members.get(member).removeRole(config.roles.symp);
                    client.guilds.get(config.guild).members.get(member).addRole(config.roles.recov)
                    console.log(`${client.guilds.get(config.guild).members.get(member).user.tag} has recovered.`);
                }
                break;
            case 3:
                if (chance < config.upgradeChance.critical) { // Infection Upgrade?
                    db.infections[member]++;
                    db.dead++;
                    db.infected--;
                    db.critical--;
                    client.guilds.get(config.guild).members.get(member).removeRole(config.roles.critical);
                    client.guilds.get(config.guild).members.get(member).addRole(config.roles.died);
                    console.log(`${client.guilds.get(config.guild).members.get(member).user.tag} has died.`);
                } else if (rChance < config.recovChance) { // Recovery?
                    db.recoveries[member] = true;
                    db.critical--;
                    db.recovered++;
                    db.infected--;
                    delete db.infections[member];
                    client.guilds.get(config.guild).members.get(member).removeRole(config.roles.critical);
                    client.guilds.get(config.guild).members.get(member).addRole(config.roles.recov)
                    console.log(`${client.guilds.get(config.guild).members.get(member).user.tag} has recovered.`);
                }
                break;
        }
    })
    console.log(`Currently infected: ${db.infected}\n Currently Symptomatic: ${db.symptomatic}\n Currently Critical: ${db.critical}\n Currently Dead: ${db.dead}\n Currently Recovered: ${db.recovered}`);

}

const infected = (member) => !!db.infections[member]

// Roll for infection
const infect = (member) => {
    if (Math.random() < config.infectionChance && !member.roles.has(config.roles.recov)) {
        db.infected++;
        // Asymptomatic Infection (no role)
        db.infections[member.id] = 1;
        console.log(`${member.user.tag} has become infected.`)
    }
}

// Handle quarantine and infection
client.on('message', msg => {
    if (msg.content === '!quarantine') {
        if (!msg.member.roles.has(config.quarantine))
            msg.member.addRole(config.quarantine)
        else
            msg.member.removeRole(config.quarantine)
    }

    msg.channel.fetchMessages({ limit: 2 }).then(messages => {
        const lastMessage = messages.last()
        // Sent a message right after an infected and is not infected
        if (infected(lastMessage.author.id) && !infected(msg.author.id)) infect(msg.member)
    }).catch(err => {
        console.error(err)
    })
});