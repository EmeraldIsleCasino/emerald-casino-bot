const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed } = require('../utils/embedBuilder');
const config = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ayuda')
    .setDescription('Muestra la lista de todos los comandos disponibles')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });
    
    const commands = {
      '💰 **ECONOMÍA**': [
        '`/balance [@usuario]` - Ver tu saldo o el de otro usuario (admin)',
        '`/recargar @usuario cantidad` - Añadir dinero a un usuario (Admin)',
        '`/quitardinero @usuario cantidad` - Quitar dinero a un usuario (Admin)',
        '`/fondos` - Ver top 15 de balances del servidor (Admin)',
        '`/transacciones @usuario [límite]` - Ver historial de transacciones (Admin)',
        '`/estadisticas` - Ver estadísticas generales del casino (Admin)',
        '`/reseteconomia` - Resetear TODA la economía ⚠️ (Solo dueño)',
        '`/insidefondos` - Ver ganancias del Inside Track (Admin)',
        '`/deportesfondos` - Ver ganancias de apuestas deportivas (Admin)'
      ],
      '🎉 **SORTEOS**': [
        '`/crearsorteo premio` - Crear un nuevo sorteo (Admin)',
        '`/cerrarsorteo` - Cerrar sorteo y seleccionar ganador (Admin)',
        '`/borrarsorteo` - Eliminar sorteo activo (Admin)',
        '`/topganadores` - Ver ranking de ganadores (Admin)'
      ],
      '⚽ **APUESTAS DEPORTIVAS**': [
        '`/eventosmesa` - Crear mesa permanente de eventos 🍀 (Admin)',
        '`/eventos` - Ver eventos activos y apostar (Todos)',
        '`/crearevento` - Crear evento deportivo (Admin)',
        '💡 **Actualización:** La mesa se actualiza automáticamente',
        '`/cerrarevento id` - Cerrar apuestas (Admin)',
        '`/finalizarevento id ganador` - Finalizar evento y pagar (Admin)',
        '`/eliminarevento` - Eliminar evento y devolver apuestas (Admin)',
        '💡 **Deportes:** ⚽ Futbol, 🏀 Basquetbol, ⚾ Beisbol, 🏎️ NASCAR, 🥊 Boxeo'
      ],
      '🏇 **INSIDE TRACK**': [
        '`/insidetrack` - Iniciar carrera de caballos (Admin)',
        '`/borrarinsidetrack` - Eliminar carrera y devolver apuestas (Admin)'
      ],
      '🂠 **BLACKJACK - MESA ÚNICA**': [
        '`/blackjackmesa` - Crear mesa compartida de Blackjack (Admin)',
        '💡 **Mecánica:** Todos los jugadores usan la misma mesa',
        '💡 **Opciones:** Pedir, Quedarse, Doblar, Dividir',
        '💡 **Apuestas:** $100 - $5000 | Pago: 1.5x en Blackjack, 2x ganadas'
      ],
      '🎡 **RULETA - MESA ÚNICA**': [
        '`/ruletamesa` - Crear mesa compartida de Ruleta (Admin)',
        '💡 **Apuestas:** Rojo/Negro (2:1), Par/Impar (2:1), Números 0-36 (36:1)',
        '💡 **Monto:** $100 - $5000 por apuesta',
        '💡 **Resultado:** Se gira automáticamente después de 2 segundos'
      ],
      '🃏 **POKER - MESA ÚNICA**': [
        '`/pokermesa` - Crear mesa compartida de Poker (Admin)',
        '💡 **Juego:** Texas Hold\'em vs Banca (Draw Poker)',
        '💡 **Mecánica:** Cambia cartas, compara manos vs la banca',
        '💡 **Ventaja casa:** Empates favorecen a la banca',
        '💡 **Apuestas:** $100 - $5000 | Pago: 2x ganadas'
      ],
      '🎰 **SLOTS - TRAGAMONEDAS**': [
        '`/slots` - Abre el menú de juegos de tragamonedas',
        '💡 **Juegos:** 7 temas diferentes con mecánicas únicas',
        '💡 **Apuestas:** $100 - $5000 por giro'
      ],
      '⚙️ **UTILIDAD**': [
        '`/guardar` - Guardar todas las bases de datos (Admin)',
        '`/limpiar cantidad` - Borrar últimos N mensajes del canal (Admin)',
        '`/ayuda` - Mostrar este mensaje'
      ]
    };
    
    const fields = [];
    
    for (const [category, cmds] of Object.entries(commands)) {
      fields.push({
        name: category,
        value: cmds.join('\n'),
        inline: false
      });
    }
    
    const embed = createEmbed({
      title: `🍀 ${config.CASINO_NAME} - 📚 Centro de Ayuda Completo 🍀`,
      description: '**¡Bienvenido al casino! Aquí encontrarás todos los comandos disponibles**\n\n🎰 **3 JUEGOS DE MESA ÚNICA:** Blackjack, Ruleta y Poker (mesas compartidas con sesiones privadas)\n💰 **ECONOMÍA:** Gestiona balances y fondos\n🎉 **EVENTOS:** Sorteos, apuestas deportivas con mesa permanente e Inside Track\n\n✨ **NOVEDADES:** Mesas permanentes que se actualizan automáticamente con nuevos eventos\n\n💡 *Usa `/ayuda` en cualquier momento para ver este mensaje*',
      fields,
      color: 0x50C878,
      footer: 'Emerald Isle Casino ® - ¡Que disfrutes jugando! 🍀'
    });
    
    await interaction.editReply({ embeds: [embed] });
  }
};
