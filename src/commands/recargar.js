const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const economy = require('../database/economy');
const { successEmbed, errorEmbed } = require('../utils/embedBuilder');
const config = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('recargar')
    .setDescription('Añade saldo a un usuario')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('Usuario al que añadir saldo')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('cantidad')
        .setDescription('Cantidad a añadir')
        .setRequired(true)
        .setMinValue(1)),
  
  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });
    
    const user = interaction.options.getUser('usuario');
    const amount = interaction.options.getInteger('cantidad');
    
    const newBalance = economy.addBalance(user.id, amount, interaction.user.id, 'Recarga por administrador');
    
    const embed = successEmbed(
      `Se han añadido **${config.CURRENCY_SYMBOL} ${amount.toLocaleString()}** a ${user.toString()}`,
      [
        { name: 'Nuevo Balance', value: `${config.CURRENCY_SYMBOL} ${newBalance.toLocaleString()}`, inline: true },
        { name: 'Administrador', value: interaction.user.toString(), inline: true }
      ]
    );
    
    await interaction.editReply({ embeds: [embed] });
  }
};
