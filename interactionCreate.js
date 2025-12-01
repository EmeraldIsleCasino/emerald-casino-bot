const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const giveaways = require('../database/giveaways');
const sports = require('../database/sports');
const insidetrack = require('../database/insidetrack');
const economy = require('../database/economy');
const blackjackDb = require('../database/blackjack');
const SlotsManager = require('../systems/slots/slotsManager');
const bj = require('../systems/blackjack/simple');
const rl = require('../systems/roulette/simple');
const pk = require('../systems/poker/simple');
const { createEmbed, errorEmbed, successEmbed } = require('../utils/embedBuilder');
const config = require('../utils/config');
const { mesas } = require('../commands/blackjackmesa');

const userSlotsState = new Map();

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return;
      
      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`Error executing ${interaction.commandName}:`, error);
        
        // Si el error es de interacción expirada, no intentar responder
        if (error.code === 10062 || error.code === 40060 || error.message?.includes('Unknown interaction')) {
          console.error(`Interacción expirada para comando: ${interaction.commandName}`);
          return;
        }
        
        try {
          const errorReply = { embeds: [errorEmbed('Ocurrió un error al ejecutar este comando.')], flags: 64 };
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorReply);
          } else {
            await interaction.reply(errorReply);
          }
        } catch (replyError) {
          console.error(`Error al responder error del comando ${interaction.commandName}:`, replyError);
        }
      }
      return;
    }
    
    if (interaction.isButton()) {
      await handleButton(interaction);
      return;
    }
    
    if (interaction.isModalSubmit()) {
      await handleModal(interaction);
      return;
    }
  }
};

async function handleButton(interaction) {
  const customId = interaction.customId;
  
  if (customId === 'giveaway_join') {
    const giveaway = giveaways.getGiveawayByMessage(interaction.message.id);
    if (!giveaway || giveaway.status !== 'active') {
      return interaction.reply({ embeds: [errorEmbed('Este sorteo ya no está activo.')], flags: 64 });
    }
    
    if (giveaways.isParticipant(giveaway.id, interaction.user.id)) {
      return interaction.reply({ embeds: [errorEmbed('Ya estás participando en este sorteo.')], flags: 64 });
    }
    
    giveaways.addParticipant(giveaway.id, interaction.user.id);
    const count = giveaways.getParticipantCount(giveaway.id);
    
    const embed = createEmbed({
      title: `${config.CASINO_NAME} - 🎉 SORTEO`,
      description: `**¡Participa para ganar!**\n\n🎁 **Premio:** ${giveaway.prize}\n\n👥 **Participantes:** ${count}\n\n*Haz clic en el botón para participar*`,
      footer: 'Emerald Isle Casino ® - ¡Buena suerte a todos!'
    });
    
    await interaction.update({ embeds: [embed] });
    await interaction.followUp({ embeds: [successEmbed('¡Te has unido al sorteo! Buena suerte.')], flags: 64 });
    return;
  }
  
  if (customId.startsWith('sports_bet_')) {
    const parts = customId.split('_');
    const team = parts[2]; // team1, team2, o draw
    const eventId = parseInt(parts[3]);
    const event = sports.getEventById(eventId);
    
    if (!event || event.status !== 'open') {
      return interaction.reply({ embeds: [errorEmbed('Las apuestas están cerradas.')], flags: 64 });
    }
    
    if (sports.getUserBet(event.id, interaction.user.id)) {
      return interaction.reply({ embeds: [errorEmbed('Ya apostaste en este evento.')], flags: 64 });
    }
    
    const modal = new ModalBuilder()
      .setCustomId(`sports_modal_${event.id}_${team}`)
      .setTitle('Realizar Apuesta');
    
    const amountInput = new TextInputBuilder()
      .setCustomId('bet_amount')
      .setLabel('Cantidad a apostar')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ej: 100')
      .setRequired(true);
    
    const row = new ActionRowBuilder().addComponents(amountInput);
    modal.addComponents(row);
    
    await interaction.showModal(modal);
    return;
  }
  
  if (customId.startsWith('event_select_')) {
    await interaction.deferReply({ flags: 64 });
    const eventId = parseInt(customId.replace('event_select_', ''));
    const event = sports.getEventById(eventId);
    
    if (!event) {
      return interaction.editReply({ embeds: [errorEmbed('Evento no encontrado.')] });
    }
    
    if (event.status !== 'open') {
      return interaction.editReply({ embeds: [errorEmbed('Las apuestas están cerradas para este evento.')] });
    }
    
    if (sports.getUserBet(event.id, interaction.user.id)) {
      return interaction.editReply({ embeds: [errorEmbed('Ya apostaste en este evento.')] });
    }
    
    const SPORTS = {
      futbol: '⚽',
      basket: '🏀',
      beisbol: '⚾',
      nascar: '🏎️',
      boxeo: '🥊'
    };
    
    const emoji = SPORTS[event.sport] || '🎯';
    let description = `🍀 **${event.title}** 🍀\n\n`;
    description += `${emoji} ${event.sport.toUpperCase()}\n\n`;
    description += `🔵 **${event.team1_name}** | Cuota: \`${event.team1_odds.toFixed(2)}\`\n`;
    description += `🔴 **${event.team2_name}** | Cuota: \`${event.team2_odds.toFixed(2)}\`\n`;
    if (event.draw_odds) {
      description += `⚪ **Empate** | Cuota: \`${event.draw_odds.toFixed(2)}\`\n`;
    }
    description += `\n*Haz clic en tu equipo para apostar*`;
    
    const buttons = [
      new ButtonBuilder()
        .setCustomId(`sports_bet_team1_${event.id}`)
        .setLabel(`${event.team1_name}`)
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔵'),
      new ButtonBuilder()
        .setCustomId(`sports_bet_team2_${event.id}`)
        .setLabel(`${event.team2_name}`)
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔴')
    ];
    
    if (event.draw_odds) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`sports_bet_draw_${event.id}`)
          .setLabel('Empate')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('⚪')
      );
    }
    
    const row = new ActionRowBuilder().addComponents(buttons);
    
    await interaction.editReply({
      embeds: [createEmbed({
        title: `🍀 ${config.CASINO_NAME} - APUESTA DEPORTIVA 🍀`,
        description,
        color: 0x50C878
      })],
      components: [row]
    });
    return;
  }
  
  if (customId.startsWith('sports_bet_team1_') || customId.startsWith('sports_bet_team2_') || customId.startsWith('sports_bet_draw_')) {
    const parts = customId.split('_');
    const eventId = parseInt(parts[parts.length - 1]);
    let team = customId.includes('team1_') ? 'team1' : customId.includes('team2_') ? 'team2' : 'draw';
    
    const event = sports.getEventById(eventId);
    
    if (!event || event.status !== 'open') {
      return interaction.reply({ embeds: [errorEmbed('Las apuestas están cerradas.')], flags: 64 });
    }
    
    if (sports.getUserBet(event.id, interaction.user.id)) {
      return interaction.reply({ embeds: [errorEmbed('Ya apostaste en este evento.')], flags: 64 });
    }
    
    const modal = new ModalBuilder()
      .setCustomId(`sports_modal_${event.id}_${team}`)
      .setTitle('Realizar Apuesta');
    
    const amountInput = new TextInputBuilder()
      .setCustomId('bet_amount')
      .setLabel('Cantidad a apostar')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ej: 100')
      .setRequired(true);
    
    const row = new ActionRowBuilder().addComponents(amountInput);
    modal.addComponents(row);
    
    await interaction.showModal(modal);
    return;
  }

  if (customId.startsWith('horse_bet_')) {
    const horseIndex = parseInt(customId.replace('horse_bet_', ''));
    const race = insidetrack.getRaceByMessage(interaction.message.id);
    
    if (!race || race.status !== 'betting') {
      return interaction.reply({ embeds: [errorEmbed('Las apuestas están cerradas.')], flags: 64 });
    }
    
    if (insidetrack.getUserBet(race.id, interaction.user.id)) {
      return interaction.reply({ embeds: [errorEmbed('Ya tienes una apuesta en esta carrera.')], flags: 64 });
    }
    
    const horse = race.horses[horseIndex];
    
    const modal = new ModalBuilder()
      .setCustomId(`horse_modal_${race.id}_${horseIndex}`)
      .setTitle(`Apostar por ${horse.name}`);
    
    const amountInput = new TextInputBuilder()
      .setCustomId('bet_amount')
      .setLabel(`Cantidad a apostar (Cuota: ${horse.odds.toFixed(2)})`)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ej: 100')
      .setRequired(true);
    
    const row = new ActionRowBuilder().addComponents(amountInput);
    modal.addComponents(row);
    
    await interaction.showModal(modal);
    return;
  }

  // SLOTS BUTTONS
  if (customId.startsWith('slots_game_')) {
    const gameKey = customId.replace('slots_game_', '');
    const game = SlotsManager.getGame(gameKey);
    
    if (!game) {
      return interaction.reply({ embeds: [errorEmbed('Juego no encontrado.')], flags: 64 });
    }

    const balance = economy.getBalance(interaction.user.id);
    
    const embed = createEmbed({
      title: `${game.name}`,
      description: `\n💰 **Tu saldo:** ${config.CURRENCY_SYMBOL} ${balance}\n\n🎰 **Apuesta actual:** ${config.CURRENCY_SYMBOL} 100\n\n*Usa los botones para ajustar la apuesta*`,
      color: game.colors,
      footer: 'Emerald Isle Casino ® - Presiona GIRAR para jugar'
    });

    userSlotsState.set(interaction.user.id, {
      gameKey,
      betAmount: 100
    });

    const buttons = [
      new ButtonBuilder()
        .setCustomId(`slots_decrease_${gameKey}`)
        .setLabel('➖ -100')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`slots_spin_${gameKey}`)
        .setLabel('🎰 GIRAR')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`slots_increase_${gameKey}`)
        .setLabel('➕ +100')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('slots_back')
        .setLabel('🔙 Volver')
        .setStyle(ButtonStyle.Secondary)
    ];

    const row = new ActionRowBuilder().addComponents(buttons);
    await interaction.reply({ embeds: [embed], components: [row], flags: 64 });
    return;
  }

  if (customId.startsWith('slots_increase_')) {
    await interaction.deferUpdate();
    const gameKey = customId.replace('slots_increase_', '');
    const state = userSlotsState.get(interaction.user.id);
    
    if (!state || state.gameKey !== gameKey) {
      return interaction.followUp({ embeds: [errorEmbed('Estado no encontrado.')], flags: 64 });
    }

    state.betAmount = Math.min(state.betAmount + 100, 5000);
    const game = SlotsManager.getGame(gameKey);
    const balance = economy.getBalance(interaction.user.id);

    const embed = createEmbed({
      title: `${game.name}`,
      description: `\n💰 **Tu saldo:** ${config.CURRENCY_SYMBOL} ${balance}\n\n🎰 **Apuesta actual:** ${config.CURRENCY_SYMBOL} ${state.betAmount}\n\n*Usa los botones para ajustar la apuesta*`,
      color: game.colors,
      footer: 'Emerald Isle Casino ® - Presiona GIRAR para jugar'
    });

    const buttons = [
      new ButtonBuilder()
        .setCustomId(`slots_decrease_${gameKey}`)
        .setLabel('➖ -100')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`slots_spin_${gameKey}`)
        .setLabel('🎰 GIRAR')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`slots_increase_${gameKey}`)
        .setLabel('➕ +100')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('slots_back')
        .setLabel('🔙 Volver')
        .setStyle(ButtonStyle.Secondary)
    ];

    const row = new ActionRowBuilder().addComponents(buttons);
    await interaction.editReply({ embeds: [embed], components: [row] });
    return;
  }

  if (customId.startsWith('slots_decrease_')) {
    await interaction.deferUpdate();
    const gameKey = customId.replace('slots_decrease_', '');
    const state = userSlotsState.get(interaction.user.id);
    
    if (!state || state.gameKey !== gameKey) {
      return interaction.followUp({ embeds: [errorEmbed('Estado no encontrado.')], flags: 64 });
    }

    state.betAmount = Math.max(state.betAmount - 100, 100);
    const game = SlotsManager.getGame(gameKey);
    const balance = economy.getBalance(interaction.user.id);

    const embed = createEmbed({
      title: `${game.name}`,
      description: `\n💰 **Tu saldo:** ${config.CURRENCY_SYMBOL} ${balance}\n\n🎰 **Apuesta actual:** ${config.CURRENCY_SYMBOL} ${state.betAmount}\n\n*Usa los botones para ajustar la apuesta*`,
      color: game.colors,
      footer: 'Emerald Isle Casino ® - Presiona GIRAR para jugar'
    });

    const buttons = [
      new ButtonBuilder()
        .setCustomId(`slots_decrease_${gameKey}`)
        .setLabel('➖ -100')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`slots_spin_${gameKey}`)
        .setLabel('🎰 GIRAR')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`slots_increase_${gameKey}`)
        .setLabel('➕ +100')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('slots_back')
        .setLabel('🔙 Volver')
        .setStyle(ButtonStyle.Secondary)
    ];

    const row = new ActionRowBuilder().addComponents(buttons);
    await interaction.editReply({ embeds: [embed], components: [row] });
    return;
  }

  if (customId.startsWith('slots_spin_')) {
    await interaction.deferUpdate();
    const gameKey = customId.replace('slots_spin_', '');
    const state = userSlotsState.get(interaction.user.id);
    
    if (!state || state.gameKey !== gameKey) {
      return interaction.followUp({ embeds: [errorEmbed('Estado no encontrado.')], flags: 64 });
    }

    const game = SlotsManager.getGame(gameKey);
    
    // Show spinning animation
    const spinningEmbed = SlotsManager.createSpinEmbed(game, 'spinning');
    await interaction.editReply({ embeds: [spinningEmbed], components: [] });

    // Simulate spinning animation
    await new Promise(resolve => setTimeout(resolve, 500));

    // Execute spin
    const result = await SlotsManager.executeSpin(interaction.user.id, gameKey, state.betAmount);
    
    if (result.error) {
      const errorEmbed = createEmbed({
        description: result.error,
        color: 0xFF6B6B
      });
      return interaction.editReply({ embeds: [errorEmbed] });
    }

    // Animate reels reveal
    const reels = result.spin.reels;
    let displayReels = ['❓', '❓', '❓'];

    // First reel
    await new Promise(resolve => setTimeout(resolve, 250));
    displayReels[0] = reels[0];
    let animEmbed = SlotsManager.createSpinEmbed(game, 'spinning', displayReels);
    await interaction.editReply({ embeds: [animEmbed] });

    // Second reel
    await new Promise(resolve => setTimeout(resolve, 250));
    displayReels[1] = reels[1];
    animEmbed = SlotsManager.createSpinEmbed(game, 'spinning', displayReels);
    await interaction.editReply({ embeds: [animEmbed] });

    // Third reel
    await new Promise(resolve => setTimeout(resolve, 250));
    displayReels[2] = reels[2];
    animEmbed = SlotsManager.createSpinEmbed(game, 'spinning', displayReels);
    await interaction.editReply({ embeds: [animEmbed] });

    // Final result
    await new Promise(resolve => setTimeout(resolve, 300));
    const resultEmbed = SlotsManager.createSpinEmbed(game, 'result', reels, {
      type: result.spin.result,
      payout: result.payout
    });

    const playAgainButtons = [
      new ButtonBuilder()
        .setCustomId(`slots_spin_${gameKey}`)
        .setLabel('🎰 GIRAR DE NUEVO')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('slots_back')
        .setLabel('🔙 Volver al Menú')
        .setStyle(ButtonStyle.Secondary)
    ];

    const row = new ActionRowBuilder().addComponents(playAgainButtons);
    await interaction.editReply({ embeds: [resultEmbed], components: [row] });
    return;
  }

  if (customId === 'slots_back') {
    await interaction.deferUpdate();
    userSlotsState.delete(interaction.user.id);
    const games = SlotsManager.getGameList();
    
    const description = games.map((game, idx) => `**${idx + 1}.** ${game.name}`).join('\n');
    
    const embed = createEmbed({
      title: `${config.CASINO_NAME} - 🎰 SLOTS`,
      description: `\n📌 **Elige un juego:**\n\n${description}\n\n💎 Mínimo: $100 | Máximo: $5000`,
      color: 0x00FF7F,
      footer: 'Emerald Isle Casino ® - ¡Buena suerte!'
    });

    const buttons = games.map((game, idx) => 
      new ButtonBuilder()
        .setCustomId(`slots_game_${game.key}`)
        .setLabel(game.name.split(' ')[1])
        .setStyle(ButtonStyle.Primary)
        .setEmoji(game.name.split(' ')[0])
    );

    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
      const row = new ActionRowBuilder().addComponents(buttons.slice(i, i + 5));
      rows.push(row);
    }

    await interaction.editReply({ embeds: [embed], components: rows });
    return;
  }

  // BLACKJACK MESA - Botón para jugar
  if (customId === 'bj_play') {
    await interaction.deferReply({ flags: 64 });
    const uid = interaction.user.id;
    bj.create(uid);
    const g = bj.get(uid);
    const bal = economy.getBalance(uid);
    
    const desc = `🍀 **Jugador:** <@${uid}>\n💰 **Saldo:** $${bal.toLocaleString()}\n**Apuesta:** $${g.bet.toLocaleString()}\n\n*Ajusta tu apuesta y haz clic en REPARTIR*`;
    const embed = createEmbed({
      title: `🍀 ${config.CASINO_NAME} - 🂠 BLACKJACK 🍀`,
      description: desc,
      color: 0x50C878
    });
    
    const btns = [
      new ButtonBuilder().setCustomId(`bj_down_${uid}`).setLabel('➖').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`bj_deal_${uid}`).setLabel('🎰 REPARTIR').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`bj_up_${uid}`).setLabel('➕').setStyle(ButtonStyle.Primary)
    ];
    
    await interaction.editReply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(btns)] });
  }

  // BLACKJACK BOTONES - Apuestas y juego
  if (customId?.startsWith('bj_up_') || customId?.startsWith('bj_down_') || customId?.startsWith('bj_deal_') || customId?.startsWith('bj_hit_') || customId?.startsWith('bj_stand_') || customId?.startsWith('bj_again_')) {
    await interaction.deferUpdate();
    const uid = interaction.user.id;
    const g = bj.get(uid);
    if (!g) return interaction.followUp({ embeds: [errorEmbed('Sin partida.')], flags: 64 });
    
    const bal = economy.getBalance(uid);
    
    if (customId.startsWith('bj_up_')) g.bet = Math.min(g.bet + 100, 5000);
    if (customId.startsWith('bj_down_')) g.bet = Math.max(g.bet - 100, 0);
    if (customId.startsWith('bj_deal_')) { 
      if (g.bet === 0 || bal < g.bet) return interaction.followUp({ embeds: [errorEmbed('Apuesta inválida')], flags: 64 }); 
      economy.deductForBet(uid, g.bet); 
      bj.deal(uid); 
    }
    if (customId.startsWith('bj_hit_')) { 
      bj.hit(uid); 
      if (g.status === 'bust') { 
        blackjackDb.recordGame(uid, g.bet, 'lose', 0); 
        const embed = createEmbed({
          title: `🍀 ${config.CASINO_NAME} - 🂠 BLACKJACK 🍀`,
          description: `🍀 <@${uid}>\n**TU MANO:** ${bj.fh(g.ph)} (${bj.hv(g.ph)})\n❌ **¡BUST! La banca prevaleció.**\n💎 Apuesta Perdida: -$${g.bet.toLocaleString()}\n\n*Mejor suerte en la próxima mano, jugador de élite.*`,
          color: 0xFF6B6B
        });
        const btns = [new ButtonBuilder().setCustomId(`bj_again_${uid}`).setLabel('🎰 OTRA').setStyle(ButtonStyle.Success)];
        await interaction.editReply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(btns)] });
        return;
      }
    }
    if (customId.startsWith('bj_stand_')) { 
      bj.stand(uid); 
      blackjackDb.recordGame(uid, g.bet, g.result, g.payout); 
      if (g.payout > 0) economy.addWinnings(uid, g.payout); 
      const res = g.result === 'win' ? '🏆 ¡VICTORIA GLORIOSA!' : g.result === 'tie' ? '⚖️ Empate Honorable' : '⚔️ La Banca Prevaleció';
      const embed = createEmbed({
        title: `🍀 ${config.CASINO_NAME} - 🂠 BLACKJACK 🍀`,
        description: `🍀 <@${uid}>\n\n**TU MANO (ÉLITE):** ${bj.fh(g.ph)} (${bj.hv(g.ph)})\n**BANCA:** ${bj.fh(g.dh)} (${bj.hv(g.dh)})\n\n${res}\n💰 **Resultado:** ${g.payout > 0 ? `+$${g.payout.toLocaleString()}` : `-$${g.bet.toLocaleString()}`}\n\n*${g.result === 'win' ? 'Tu maestría fue evidente. La élite reconoce la élite.' : 'El destino ha hablado. Regresa a conquistar la gloria.'}*`,
        color: g.result === 'win' ? 0x00FF00 : 0xFF6B6B
      });
      const btns = [new ButtonBuilder().setCustomId(`bj_again_${uid}`).setLabel('🎰 OTRA').setStyle(ButtonStyle.Success)];
      await interaction.editReply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(btns)] });
      return;
    }
    if (customId.startsWith('bj_again_')) { 
      bj.del(uid); 
      bj.create(uid); 
      const g2 = bj.get(uid);
      const bal2 = economy.getBalance(uid);
      const embed = createEmbed({
        title: `🍀 ${config.CASINO_NAME} - 🂠 BLACKJACK 🍀`,
        description: `👑 **JUGADOR VIP:** <@${uid}>\n💰 **Saldo:** $${bal2.toLocaleString()}\n💎 **Apuesta Siguiente:** $${g2.bet.toLocaleString()}\n\n✨ *Regresa a conquistar gloria. Ajusta tu apuesta y REPARTIR*\n🏆 **La élite nunca se rinde** 🏆`,
        color: 0x50C878
      });
      const btns = [
        new ButtonBuilder().setCustomId(`bj_down_${uid}`).setLabel('➖ Menos').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`bj_deal_${uid}`).setLabel('🎰 REPARTIR').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`bj_up_${uid}`).setLabel('➕ Más').setStyle(ButtonStyle.Primary)
      ];
      await interaction.editReply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(btns)] });
      return;
    }
    
    let desc, btns;
    if (g.status === 'bet') {
      desc = `👑 **JUGADOR VIP:** <@${uid}>\n💰 **Saldo:** $${bal.toLocaleString()}\n💎 **Apuesta:** $${g.bet.toLocaleString()}\n\n✨ *Ajusta tu apuesta de lujo y haz clic en REPARTIR* ✨`;
      btns = [
        new ButtonBuilder().setCustomId(`bj_down_${uid}`).setLabel('➖ Menos').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`bj_deal_${uid}`).setLabel('🎰 REPARTIR').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`bj_up_${uid}`).setLabel('➕ Más').setStyle(ButtonStyle.Primary)
      ];
    } else {
      desc = `🍀 <@${uid}>\n**TU MANO (ÉLITE):** ${bj.fh(g.ph)} (${bj.hv(g.ph)})\n**BANCA:** ${bj.fh(g.dh, true)}\n💎 **Apuesta Premium:** $${g.bet.toLocaleString()}\n\n*Demuestra tu maestría*`;
      btns = [
        new ButtonBuilder().setCustomId(`bj_hit_${uid}`).setLabel('🎯 Pedir').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`bj_stand_${uid}`).setLabel('👑 Quedarse').setStyle(ButtonStyle.Success)
      ];
    }
    
    const embed = createEmbed({
      title: `🍀 ${config.CASINO_NAME} - 🂠 BLACKJACK 🍀`,
      description: desc,
      color: 0x50C878
    });
    
    await interaction.editReply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(btns)] });
  }

  // RULETA MESA - Jugar (respuesta privada para cada jugador)
  if (customId === 'rl_play') {
    await interaction.deferReply({ flags: 64 });
    const uid = interaction.user.id;
    try {
      rl.create(uid);
      const bal = economy.getBalance(uid) || 0;
      
      const embed = createEmbed({
        title: `🍀 ${config.CASINO_NAME} - 🎡 RULETA 🍀`,
        description: `👑 **JUGADOR VIP:** <@${uid}>\n💰 **Patrimonio de Élite:** $${bal.toLocaleString()}\n\n╔════════════════════════════╗\n║ **APUESTAS LEGENDARIAS**    ║\n╠════════════════════════════╣\n║ 🔴 ROJO      → Pago 2:1    ║\n║ ⚫ NEGRO      → Pago 2:1    ║\n║ 🔷 PAR       → Pago 2:1    ║\n║ 🔶 IMPAR     → Pago 2:1    ║\n╚════════════════════════════╝`,
        color: 0xE91E63
      });
      
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`rl_type_r_${uid}`).setLabel('🔴 ROJO').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`rl_type_b_${uid}`).setLabel('⚫ NEGRO').setStyle(ButtonStyle.Secondary)
      );
      
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`rl_type_e_${uid}`).setLabel('🔷 PAR').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`rl_type_o_${uid}`).setLabel('🔶 IMPAR').setStyle(ButtonStyle.Primary)
      );
      
      await interaction.editReply({ embeds: [embed], components: [row1, row2] });
    } catch (err) {
      console.error('Error en rl_play:', err);
      await interaction.editReply({ embeds: [errorEmbed('Error al iniciar ruleta')] });
    }
  }

  // RULETA - Seleccionar cantidad (actualizar mismo mensaje)
  if (customId?.startsWith('rl_type_') && customId.includes('_')) {
    await interaction.deferUpdate();
    const uid = interaction.user.id;
    const g = rl.get(uid);
    if (!g) return;
    
    const typeMap = { r: 'r', b: 'b', e: 'e', o: 'o' };
    const labels = { r: '🔴 ROJO', b: '⚫ NEGRO', e: '🔷 PAR', o: '🔶 IMPAR' };
    const typeChar = customId.split('_')[2];
    g.tempType = typeMap[typeChar];
    
    const bal = economy.getBalance(uid) || 0;
    const embed = createEmbed({
      title: `${config.CASINO_NAME} - 🎡 RULETA`,
      description: `👤 <@${uid}>\n💰 **Saldo:** $${bal.toLocaleString()}\n💎 **Apuesta:** ${labels[g.tempType]}\n\n━━━━━━━━━━━━━━━━━\n**SELECCIONA CANTIDAD**`,
      color: 0xE91E63
    });
    
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`rl_amt_100_${uid}`).setLabel('💵 $100').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`rl_amt_500_${uid}`).setLabel('💵 $500').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`rl_amt_1k_${uid}`).setLabel('💰 $1000').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`rl_amt_5k_${uid}`).setLabel('🏆 $5000').setStyle(ButtonStyle.Danger)
    );
    
    await interaction.editReply({ embeds: [embed], components: [row] });
  }

  // RULETA - Girar (actualizar mismo mensaje)
  if (customId?.startsWith('rl_amt_') && customId.includes('_')) {
    await interaction.deferUpdate();
    const uid = interaction.user.id;
    const g = rl.get(uid);
    if (!g || !g.tempType) return;
    
    const amtMap = { '100': 100, '500': 500, '1k': 1000, '5k': 5000 };
    const amtStr = customId.split('_')[2];
    const amt = amtMap[amtStr] || 0;
    const bal = economy.getBalance(uid) || 0;
    
    if (amt === 0 || bal < amt) return;
    
    economy.deductForBet(uid, amt);
    rl.setBet(uid, g.tempType, amt);
    
    const embed = createEmbed({
      title: `${config.CASINO_NAME} - 🎡 RULETA`,
      description: `👤 <@${uid}>\n💎 **Apuesta:** $${amt}\n\n🎡 🎡 🎡 🎡 🎡 🎡\n**¡GIRANDO LA RULETA!**\n🎡 🎡 🎡 🎡 🎡 🎡`,
      color: 0xE91E63
    });
    
    await interaction.editReply({ embeds: [embed], components: [] });
    await new Promise(r => setTimeout(r, 2000));
    
    const result = rl.spin(uid);
    const isRed = rl.RED.includes(result);
    const win = g.win;
    
    if (win > 0) economy.addWinnings(uid, win);
    
    const resEmbed = createEmbed({
      title: `${config.CASINO_NAME} - 🎡 RULETA`,
      description: `👤 <@${uid}>\n\n┌──────────────────┐\n│ 🎡 **${result}** 🎡 │\n│ ${isRed ? '🔴 ROJO' : '⚫ NEGRO'} - ${result % 2 === 0 ? '🔷 PAR' : '🔶 IMPAR'} │\n└──────────────────┘\n\n${win > 0 ? `🎉 **¡GANASTE!**\n💰 **+$${win}**` : `❌ **¡Pierdes!**\n💎 **-$${amt}**`}`,
      color: win > 0 ? 0x00FF00 : 0xFF6B6B
    });
    
    const btns = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`rl_again_${uid}`).setLabel('🎡 OTRA RONDA').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`rl_exit_${uid}`).setLabel('❌ Salir').setStyle(ButtonStyle.Secondary)
    );
    
    await interaction.editReply({ embeds: [resEmbed], components: [btns] });
  }

  // RULETA - Otra o salir (actualizar mismo mensaje)
  if (customId?.match(/^rl_(again|exit)_\d+$/)) {
    await interaction.deferUpdate();
    const uid = interaction.user.id;
    
    if (customId.includes('rl_exit')) {
      rl.del(uid);
      const embed = createEmbed({
        title: `${config.CASINO_NAME} - 🎡 RULETA`,
        description: '✅ **Saliste de la ruleta.**',
        color: 0x00FF00
      });
      await interaction.editReply({ embeds: [embed], components: [] });
      return;
    }
    
    rl.del(uid);
    rl.create(uid);
    const bal = economy.getBalance(uid) || 0;
    
    const embed = createEmbed({
      title: `${config.CASINO_NAME} - 🎡 RULETA`,
      description: `👤 **Jugador:** <@${uid}>\n💰 **Saldo:** $${bal.toLocaleString()}\n\n━━━━━━━━━━━━━━━━━\n**APUESTAS DISPONIBLES**\n🔴 Rojo 2:1 | ⚫ Negro 2:1\n🔷 Par 2:1 | 🔶 Impar 2:1`,
      color: 0xE91E63
    });
    
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`rl_type_r_${uid}`).setLabel('🔴 ROJO').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`rl_type_b_${uid}`).setLabel('⚫ NEGRO').setStyle(ButtonStyle.Secondary)
    );
    
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`rl_type_e_${uid}`).setLabel('🔷 PAR').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`rl_type_o_${uid}`).setLabel('🔶 IMPAR').setStyle(ButtonStyle.Primary)
    );
    
    await interaction.editReply({ embeds: [embed], components: [row1, row2] });
  }

  // POKER MESA - Jugar
  if (customId === 'pk_play') {
    await interaction.deferReply({ flags: 64 });
    const uid = interaction.user.id;
    pk.create(uid);
    const bal = economy.getBalance(uid);
    
    const embed = createEmbed({
      title: `🍀 ${config.CASINO_NAME} - 🃏 TEXAS HOLD'EM 🍀`,
      description: `👑 **JUGADOR DE ÉLITE:** <@${uid}>\n💰 **Patrimonio Premium:** $${bal.toLocaleString()}\n\n✨ 🃏 🃏 🃏 🃏 🃏 ✨\n\n**╔═══ APUESTAS EXCLUSIVAS ═══╗**\n**║ Mínimo: $100             ║**\n**║ Máximo: $5000           ║**\n**╚════════════════════════════╝**\n\n🏆 *Solo ganas si tu mano SUPERA la banca*\n💎 *Payout Premium: 2:1 en victorias*\n⭐ *Comparación justa - Sin trucos*`,
      color: 0x50C878
    });
    
    const btns = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`pk_bet_100_${uid}`).setLabel('💵 $100').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`pk_bet_500_${uid}`).setLabel('💵 $500').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`pk_bet_1k_${uid}`).setLabel('💰 $1000').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`pk_bet_5k_${uid}`).setLabel('🏆 $5000').setStyle(ButtonStyle.Danger)
    );
    
    await interaction.editReply({ embeds: [embed], components: [btns] });
  }

  // POKER - Repartir mano
  if (customId?.startsWith('pk_bet_')) {
    await interaction.deferUpdate();
    const uid = interaction.user.id;
    const g = pk.get(uid);
    if (!g) return interaction.followUp({ embeds: [errorEmbed('Error.')], flags: 64 });
    
    const bets = { 
      [`pk_bet_100_${uid}`]: 100, 
      [`pk_bet_500_${uid}`]: 500, 
      [`pk_bet_1k_${uid}`]: 1000, 
      [`pk_bet_5k_${uid}`]: 5000,
      'pk_bet_100': 100,
      'pk_bet_500': 500,
      'pk_bet_1k': 1000,
      'pk_bet_5k': 5000
    };
    const bet = bets[customId];
    const bal = economy.getBalance(uid);
    
    if (bal < bet) return interaction.followUp({ embeds: [errorEmbed('Saldo insuficiente')], flags: 64 });
    
    economy.deductForBet(uid, bet);
    g.bet = bet;
    // Aplicar comisión (rake): 5% máximo 20 fichas
    const rake = Math.min(Math.floor(bet * 0.05), 20);
    g.rake = rake;
    
    const cardsStr = g.ph.map((c, i) => `**${i+1}:** ${c.r}${c.s}`).join(' | ');
    const embed = createEmbed({
      title: `🍀 ${config.CASINO_NAME} - 🃏 TEXAS HOLD'EM 🍀`,
      description: `🍀 <@${uid}> | 💎 **Apuesta Premium:** $${bet.toLocaleString()} | 🏦 **Rake:** $${g.rake}\n\n🍀 POKER 🍀\n**TUS CARTAS DE ÉLITE**\n${pk.formatHand(g.ph)}\n🍀 POKER 🍀\n\n**╔════ ESTRATEGIA ════╗**\n**║ Selecciona cartas para cambiar**\n**╚═══════════════════╝**\n\n🎯 *Haz clic en números para cambiar*\n🏆 *O presiona JUGAR sin cambiar*`,
      color: 0x50C878
    });
    
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`pk_toggle_0_${uid}`).setLabel('1️⃣').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`pk_toggle_1_${uid}`).setLabel('2️⃣').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`pk_toggle_2_${uid}`).setLabel('3️⃣').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`pk_toggle_3_${uid}`).setLabel('4️⃣').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`pk_toggle_4_${uid}`).setLabel('5️⃣').setStyle(ButtonStyle.Secondary)
    );
    
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`pk_draw_${uid}`).setLabel('🔄 CAMBIAR').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`pk_stand_${uid}`).setLabel('🎯 JUGAR').setStyle(ButtonStyle.Success)
    );
    
    g.selected = [false, false, false, false, false];
    await interaction.editReply({ embeds: [embed], components: [row1, row2] });
  }

  // POKER - Toggle cartas
  if (customId?.startsWith('pk_toggle_')) {
    await interaction.deferUpdate();
    const uid = interaction.user.id;
    const g = pk.get(uid);
    if (!g) return;
    
    const parts = customId.split('_');
    const idx = parseInt(parts[2]);
    g.selected[idx] = !g.selected[idx];
    
    const count = g.selected.filter(s => s).length;
    const selStr = g.selected.map((s, i) => s ? `**${g.ph[i].r}${g.ph[i].s}** ✓` : `${g.ph[i].r}${g.ph[i].s}`).join(' | ');
    const embed = createEmbed({
      title: `🍀 ${config.CASINO_NAME} - 🃏 TEXAS HOLD'EM 🍀`,
      description: `🍀 <@${uid}> | 💎 **Apuesta Premium:** $${g.bet.toLocaleString()} | 🏦 **Rake:** $${g.rake}\n\n🍀 POKER 🍀\n**TUS CARTAS SELECCIONADAS**\n${selStr}\n🍀 POKER 🍀\n\n**╔════ CAMBIOS MARCADOS ════╗**\n**║ ${count} carta${count !== 1 ? 's' : ''} para cambiar**\n**╚════════════════════════╝**\n\n🎯 *Haz clic para deseleccionar* `,
      color: 0x50C878
    });
    
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`pk_toggle_0_${uid}`).setLabel('1️⃣').setStyle(g.selected[0] ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`pk_toggle_1_${uid}`).setLabel('2️⃣').setStyle(g.selected[1] ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`pk_toggle_2_${uid}`).setLabel('3️⃣').setStyle(g.selected[2] ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`pk_toggle_3_${uid}`).setLabel('4️⃣').setStyle(g.selected[3] ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`pk_toggle_4_${uid}`).setLabel('5️⃣').setStyle(g.selected[4] ? ButtonStyle.Success : ButtonStyle.Secondary)
    );
    
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`pk_draw_${uid}`).setLabel('🔄 CAMBIAR').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`pk_stand_${uid}`).setLabel('🎯 JUGAR').setStyle(ButtonStyle.Success)
    );
    
    await interaction.editReply({ embeds: [embed], components: [row1, row2] });
  }

  // POKER - Cambiar cartas
  if (customId?.startsWith('pk_draw_')) {
    await interaction.deferUpdate();
    const uid = interaction.user.id;
    const g = pk.get(uid);
    if (!g) return;
    
    const indices = g.selected.map((s, i) => s ? i : -1).filter(i => i >= 0);
    pk.drawCards(uid, indices);
    
    g.selected = [false, false, false, false, false];
    
    const embed = createEmbed({
      title: `🍀 ${config.CASINO_NAME} - 🃏 TEXAS HOLD'EM 🍀`,
      description: `🍀 <@${uid}> | 💎 **Apuesta Premium:** $${g.bet.toLocaleString()} | 🏦 **Rake:** $${g.rake}\n\n🍀 POKER 🍀\n**TUS CARTAS NUEVAS (ELEGIDAS)**\n${pk.formatHand(g.ph)}\n🍀 POKER 🍀\n\n🏆 **¡El momento de la verdad ha llegado!**\n🎯 *Haz clic JUGAR para enfrentar a la Banca*`,
      color: 0x50C878
    });
    
    const btns = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`pk_stand_${uid}`).setLabel('🎯 JUGAR').setStyle(ButtonStyle.Success)
    );
    
    await interaction.editReply({ embeds: [embed], components: [btns] });
  }

  // POKER - Comparar manos
  if (customId?.startsWith('pk_stand_')) {
    await interaction.deferUpdate();
    const uid = interaction.user.id;
    const g = pk.get(uid);
    if (!g) return;
    
    const result = pk.compare(uid);
    const win = result === 'win' ? g.bet * 2 : 0;
    const titles = { 0: 'High Card', 1: 'One Pair', 2: 'Two Pair', 3: 'Three of a Kind', 4: 'Straight', 5: 'Flush', 6: 'Full House', 7: 'Four of a Kind', 8: 'Straight Flush' };
    const pRank = titles[pk.rankHand(g.ph).type];
    const dRank = titles[pk.rankHand(g.dh).type];
    const emojis = { 0: '🎫', 1: '👥', 2: '👥👥', 3: '🎯🎯🎯', 4: '➡️', 5: '🌈', 6: '🏠', 7: '💣💣💣💣', 8: '🌈➡️' };
    
    if (win > 0) economy.addWinnings(uid, win);
    
    const resEmbed = createEmbed({
      title: `🍀 ${config.CASINO_NAME} - 🃏 SHOWDOWN FINAL 🍀`,
      description: `╔═════════════════════════════╗\n║ 🃏 **RESULTADO DEFINITIVO** 🃏 ║\n╚═════════════════════════════╝\n\n👑 **TU MANO DE ÉLITE**\n${pk.formatHand(g.ph)}\n${emojis[pk.rankHand(g.ph).type]} ${pRank}\n\n⚔️ ━━━━ ENFRENTAMIENTO ━━━━ ⚔️\n\n🏦 **BANCA**\n${pk.formatHand(g.dh)}\n${emojis[pk.rankHand(g.dh).type]} ${dRank}\n\n${'═'.repeat(30)}\n\n${result === 'win' ? `🏆 **¡VICTORIA ÉPICA!** 🏆\n💰 **Ganancias:** +$${win.toLocaleString()}\n\n**La élite ha prevalecido. Tu maestría es incontestable.**` : `⚔️ **LA BANCA PREVALECIÓ** ⚔️\n💎 **Pérdida:** -$${g.bet.toLocaleString()}\n\n*El destino ha hablado. Los campeones no se rinden.*`}`,
      color: result === 'win' ? 0x00FF00 : 0xFF6B6B
    });
    
    const btns = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`pk_again_${uid}`).setLabel('🃏 OTRA MANO').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`pk_exit_${uid}`).setLabel('❌ Salir').setStyle(ButtonStyle.Secondary)
    );
    
    await interaction.editReply({ embeds: [resEmbed], components: [btns] });
  }

  // POKER - Otra o salir
  if (customId?.startsWith('pk_again_') || customId?.startsWith('pk_exit_')) {
    await interaction.deferUpdate();
    const uid = interaction.user.id;
    
    if (customId.startsWith('pk_exit_')) {
      pk.del(uid);
      await interaction.editReply({ components: [] });
      return;
    }
    
    pk.del(uid);
    pk.create(uid);
    const bal = economy.getBalance(uid);
    
    const embed = createEmbed({
      title: `${config.CASINO_NAME} - 🃏 TEXAS HOLD'EM POKER`,
      description: `👤 **Jugador:** <@${uid}>\n💰 **Saldo:** $${bal}\n\n🃏 🃏 🃏 🃏 🃏\n\n**┌─── APUESTAS ───┐**\n**│ Mín: $100    │**\n**│ Máx: $5000   │**\n**└────────────────┘**\n\n💡 *Solo ganas si tu mano es MEJOR que la banca*\n💡 *Rake (comisión): 5% máximo 20 fichas*`,
      color: 0x50C878
    });
    
    const btns = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`pk_bet_100_${uid}`).setLabel('💵 $100').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`pk_bet_500_${uid}`).setLabel('💵 $500').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`pk_bet_1k_${uid}`).setLabel('💰 $1000').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`pk_bet_5k_${uid}`).setLabel('🏆 $5000').setStyle(ButtonStyle.Danger)
    );
    
    await interaction.editReply({ embeds: [embed], components: [btns] });
  }
}

async function handleModal(interaction) {
  const customId = interaction.customId;
  
  if (customId.startsWith('sports_modal_')) {
    const parts = customId.split('_');
    const eventId = parseInt(parts[2]);
    const team = parts[3];
    
    const amount = parseInt(interaction.fields.getTextInputValue('bet_amount'));
    
    if (isNaN(amount) || amount <= 0) {
      return interaction.reply({ embeds: [errorEmbed('Introduce una cantidad válida.')], flags: 64 });
    }
    
    const balance = economy.getBalance(interaction.user.id);
    if (balance < amount) {
      return interaction.reply({ embeds: [errorEmbed(`No tienes suficiente saldo. Tu balance: ${config.CURRENCY_SYMBOL} ${balance.toLocaleString()}`)], flags: 64 });
    }
    
    const event = sports.getEventById(eventId);
    if (!event || event.status !== 'open') {
      return interaction.reply({ embeds: [errorEmbed('Las apuestas están cerradas.')], flags: 64 });
    }
    
    let odds, teamName;
    switch (team) {
      case 'team1':
        odds = event.team1_odds;
        teamName = event.team1_name;
        break;
      case 'team2':
        odds = event.team2_odds;
        teamName = event.team2_name;
        break;
      case 'draw':
        odds = event.draw_odds;
        teamName = 'Empate';
        break;
    }
    
    const potentialWin = Math.floor(amount * odds);
    
    economy.deductForBet(interaction.user.id, amount);
    sports.placeBet(eventId, interaction.user.id, team, amount, potentialWin);
    
    await interaction.reply({
      embeds: [successEmbed(
        `Apuesta realizada`,
        [
          { name: 'Equipo', value: teamName, inline: true },
          { name: 'Cantidad', value: `${config.CURRENCY_SYMBOL} ${amount.toLocaleString()}`, inline: true },
          { name: 'Cuota', value: odds.toFixed(2), inline: true },
          { name: 'Ganancia Potencial', value: `${config.CURRENCY_SYMBOL} ${potentialWin.toLocaleString()}`, inline: true }
        ]
      )],
      flags: 64
    });
    return;
  }
  
  if (customId.startsWith('horse_modal_')) {
    const parts = customId.split('_');
    const raceId = parseInt(parts[2]);
    const horseIndex = parseInt(parts[3]);
    
    const amount = parseInt(interaction.fields.getTextInputValue('bet_amount'));
    
    if (isNaN(amount) || amount <= 0) {
      return interaction.reply({ embeds: [errorEmbed('Introduce una cantidad válida.')], flags: 64 });
    }
    
    if (amount < 100) {
      return interaction.reply({ embeds: [errorEmbed(`❌ La apuesta mínima es ${config.CURRENCY_SYMBOL} 100.`)], flags: 64 });
    }
    
    if (amount > 5000) {
      return interaction.reply({ embeds: [errorEmbed(`❌ La apuesta máxima es ${config.CURRENCY_SYMBOL} 5000.`)], flags: 64 });
    }
    
    const balance = economy.getBalance(interaction.user.id);
    if (balance < amount) {
      return interaction.reply({ embeds: [errorEmbed(`No tienes suficiente saldo. Tu balance: ${config.CURRENCY_SYMBOL} ${balance.toLocaleString()}`)], flags: 64 });
    }
    
    const race = insidetrack.getRaceById(raceId);
    if (!race || race.status !== 'betting') {
      return interaction.reply({ embeds: [errorEmbed('Las apuestas están cerradas.')], flags: 64 });
    }
    
    const horse = race.horses[horseIndex];
    const potentialWin = Math.floor(amount * horse.odds);
    
    economy.deductForBet(interaction.user.id, amount);
    insidetrack.placeBet(raceId, interaction.user.id, horseIndex, amount, horse.odds);
    
    await interaction.reply({
      embeds: [successEmbed(
        `Apuesta realizada`,
        [
          { name: 'Caballo', value: `${horse.emoji} ${horse.name}`, inline: true },
          { name: 'Cantidad', value: `${config.CURRENCY_SYMBOL} ${amount.toLocaleString()}`, inline: true },
          { name: 'Cuota', value: horse.odds.toFixed(2), inline: true },
          { name: 'Ganancia Potencial', value: `${config.CURRENCY_SYMBOL} ${potentialWin.toLocaleString()}`, inline: true }
        ]
      )],
      flags: 64
    });
    return;
  }
}
