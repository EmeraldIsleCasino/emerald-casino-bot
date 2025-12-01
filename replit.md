# Emerald Isle Casino ® - Discord Bot

## Overview
Professional Discord bot for **Emerald Isle Casino ®** with complete systems for economy, giveaways, sports betting, and horse racing (Inside Track).

## Project Type
Discord.js v14 bot with slash commands, button interactions, and SQLite databases.

## Current State
- All systems implemented and fully functional
- Admin-only slash commands
- User interactions via buttons and embeds
- Separate databases for each system
- Auto-save every 60 seconds
- **ALL CASINO GAMES USE OFFICIAL PROBABILITIES** (verified)

## Cambios Recientes
- **01 de Diciembre, 2025**: Sistema de Anuncios Automáticos
  - ✨ **SISTEMA DE EMBEDS PARA PROMOCIÓN:**
    - Anuncios aleatorios cada 10 minutos
    - 8 mensajes diferentes invitando a apostar
    - Embeds con logos Emerald Isle (🍀)
    - Botón directo a canal de soporte para recargas
    - Se actualiza automáticamente sin borrar/recrear
  
- **30 de Noviembre, 2025**: Probabilidades Oficiales + Mesas Permanentes Completas
  - ✨ **PROBABILIDADES EXACTAS IMPLEMENTADAS:**
    - **Blackjack:** 55% banca - 45% jugador (probabilidad aleatoria en stand)
    - **Ruleta:** 44% jugador en apuestas par/impar/color (pago 2:1 condicional)
    - **Slots:** RTP 85-90% (multiplicadores y probabilidades ajustados)
    - **Poker:** 5% rake máximo 20 fichas, comparación justa (sin ventaja abrumadora)
  - ✨ **MESAS PERMANENTES/PRIVADAS COMPLETAS:**
    - Blackjack: Mesa privada como Ruleta con `deferReply()` + `editReply()`
    - Poker: Completamente convertido a mesa privada (todos los handlers usan `editReply()`)
    - Ruleta: Mesa privada ya funcional
  - ✨ **AISLAMIENTO DE SESIONES:**
    - Todos los botones incluyen UID en customId para evitar conflictos entre jugadores
    - Cada jugador recibe embeds privados independientes
  - ✨ **INFORMACIÓN DE RAKE EN POKER:**
    - Se muestra la comisión aplicada en cada mano
    - Cálculo automático: 5% de la apuesta, máximo 20 fichas

## Structure
```
src/
├── commands/           # Slash commands
│   ├── balance.js      # Check user balance
│   ├── recargar.js     # Add balance (admin)
│   ├── quitardinero.js # Remove balance (admin)
│   ├── fondos.js       # View all funds (admin)
│   ├── insidefondos.js # Inside Track funds (admin)
│   ├── deportesfondos.js # Sports betting funds (admin)
│   ├── crearsorteo.js  # Create giveaway (admin)
│   ├── cerrarsorteo.js # Close giveaway (admin)
│   ├── borrarsorteo.js # Delete giveaway (admin)
│   ├── topganadores.js # Top winners (admin)
│   ├── crearevento.js  # Create sports event (admin)
│   ├── cerrarevento.js # Close betting (admin)
│   ├── finalizarevento.js # Finalize event (admin)
│   ├── eliminarevento.js # Delete event (admin)
│   ├── insidetrack.js  # Start horse race (admin)
│   ├── borrarinsidetrack.js # Delete race (admin)
│   ├── blackjackmesa.js # Create blackjack table (admin)
│   ├── ruletamesa.js   # Create roulette table (admin)
│   ├── pokermesa.js    # Create poker table (admin)
│   └── guardar.js      # Manual save (admin)
├── database/           # Database modules
│   ├── index.js        # DB initialization
│   ├── economy.js      # Economy operations
│   ├── giveaways.js    # Giveaway operations
│   ├── sports.js       # Sports betting operations
│   └── insidetrack.js  # Horse racing operations
├── events/             # Event handlers
│   ├── ready.js        # Bot ready event
│   └── interactionCreate.js # Buttons/commands handler
├── systems/            # Game systems
│   ├── slots/          # Slots system
│   ├── blackjack/      # Blackjack system
│   ├── roulette/       # Roulette system
│   └── poker/          # Poker system
├── utils/              # Utilities
│   ├── config.js       # Bot configuration
│   └── embedBuilder.js # Embed helpers
└── index.js            # Main entry point
```

## Setup Instructions

### Local Setup (Replit)

#### 1. Get a Discord Bot Token
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application or select an existing one
3. Go to the **Bot** section
4. Click "Reset Token" and copy the token
5. Enable these Privileged Gateway Intents:
   - Server Members Intent
   - Message Content Intent

#### 2. Add Token to Replit
1. Click the "Secrets" tab (lock icon) in Replit sidebar
2. Add a new secret:
   - Key: `DISCORD_BOT_TOKEN`
   - Value: Your bot token

#### 3. Invite Bot to Server
Use this URL format (replace CLIENT_ID with your app's ID):
```
https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID&permissions=8&scope=bot%20applications.commands
```

#### 4. Run the Bot
The bot will automatically start via the configured workflow.

### Deploy to Railway (24/7 Free)

Railway ofrece **500 horas gratis/mes** (suficiente para 24/7). Sigue estos pasos:

#### 1. Preparar el código
- El repositorio ya está listo para Railway
- Asegúrate de hacer push a GitHub

#### 2. Crear proyecto en Railway
1. Ve a [railway.app](https://railway.app)
2. Inicia sesión con GitHub
3. Haz clic en "New Project"
4. Selecciona "Deploy from GitHub repo"
5. Selecciona este repositorio

#### 3. Configurar Variables de Entorno
1. En Railway, ve a la pestaña "Variables"
2. Añade:
   - Key: `DISCORD_BOT_TOKEN`
   - Value: Tu token de Discord
3. Haz clic en "Deploy"

#### 4. Verificar que está corriendo
- Railway automáticamente ejecutará `npm start`
- El bot debería estar online en 1-2 minutos
- Ve a los Logs para verificar que todo está correcto

**Ventajas:**
✅ 500 horas gratis/mes (suficiente para 24/7)
✅ Escala automáticamente
✅ Reinicia automáticamente si falla
✅ Integración con GitHub para auto-deploy

**Notas importantes:**
- Las bases de datos SQLite se almacenan en memoria volátil - considera migrar a PostgreSQL si necesitas persistencia
- Railway proporciona 5GB de almacenamiento gratuito si necesitas persistencia de archivos

## Comandos

### 💰 Economía
| Comando | Descripción |
|---------|------------|
| `/balance` | Ver tu saldo (todos) o de otro usuario (Admin) |
| `/recargar @usuario cantidad` | Añadir saldo a un usuario (Admin) |
| `/quitardinero @usuario cantidad` | Quitar saldo a un usuario (Admin) |
| `/fondos` | Ver balances de todos los usuarios (Admin) |
| `/transacciones @usuario [límite]` | Ver historial de transacciones (Admin) |
| `/estadisticas` | Ver estadísticas generales del casino (Admin) |
| `/reseteconomia` | Resetear TODA la economía ⚠️ (Solo dueño servidor) |
| `/insidefondos` | Ver ganancias del Inside Track (Admin) |
| `/deportesfondos` | Ver ganancias de apuestas deportivas (Admin) |

### 🎉 Sorteos (Solo Admin)
| Comando | Descripción |
|---------|------------|
| `/crearsorteo premio` | Crear un nuevo sorteo |
| `/cerrarsorteo` | Cerrar sorteo y seleccionar ganador |
| `/borrarsorteo` | Eliminar sorteo activo |
| `/topganadores` | Ver top de ganadores |

### ⚽ Apuestas Deportivas (Solo Admin)
| Comando | Descripción |
|---------|------------|
| `/crearevento` | Crear evento deportivo |
| `/cerrarevento` | Cerrar apuestas |
| `/finalizarevento ganador` | Finalizar evento y pagar |
| `/eliminarevento` | Eliminar evento y devolver apuestas |

### 🏇 Inside Track (Solo Admin)
| Comando | Descripción |
|---------|------------|
| `/insidetrack` | Iniciar carrera de caballos |
| `/borrarinsidetrack` | Eliminar carrera y devolver apuestas |

### 🎰 Juegos (Todos los usuarios)
| Comando | Descripción |
|---------|------------|
| `/blackjackmesa` | Crear mesa única de Blackjack (admin) |
| `/ruletamesa` | Crear mesa única de Ruleta (admin) |
| `/pokermesa` | Crear mesa única de Poker (admin) |

### 📢 Anuncios & Promoción
| Comando | Descripción |
|---------|------------|
| `/startanuncios` | Inicia sistema de anuncios cada 10 minutos (Admin) |
| `/stopanuncios` | Detiene sistema de anuncios (Admin) |
| `/eventoscasino` | Eventos del casino físico (/prop 2188) cada 10 minutos (Admin) |

### ⚙️ Utilidad
| Comando | Descripción |
|---------|------------|
| `/guardar` | Guardar todas las bases de datos (Admin) |
| `/limpiar cantidad` | Borrar últimos N mensajes del canal (Admin) |
| `/ayuda` | Ver lista de comandos disponibles (todos) |
| `/checkganadores [deporte]` | Ver ganadores/perdedores de apuestas (Admin) |

## Game Mechanics & Probabilities

### Blackjack (Mesa Privada)
- **Probabilidades:** 55% banca - 45% jugador
- **Mecanismo:** El jugador solo gana si vence la banca Y supera el threshold de 45%
- **Mesas:** Privadas - cada jugador ve su partida en embed independiente
- **Apuestas:** $100-$5000
- **Payout:** 1.5x en ganancias

### Ruleta (Mesa Privada)
- **Probabilidades:** 44% jugador en rojo/negro/par/impar
- **Mecanismo:** Solo paga 2:1 si resultado físico correcto Y pasa el 44% de probabilidad
- **Mesas:** Privadas - cada jugador recibe embed independiente
- **Apuestas:** $100-$5000
- **Tipos:** Rojo/Negro (2:1), Par/Impar (2:1), Números específicos (36:1)

### Poker (Mesa Privada)
- **Comisión (Rake):** 5% de la apuesta, máximo 20 fichas
- **Mecanismo:** Comparación justa de manos sin ventaja abrumadora
- **Mesas:** Privadas - cada jugador juega independientemente con la banca
- **Apuestas:** $100-$5000
- **Variante:** Texas Hold'em vs Banca con cambio de cartas (draw)

### Slots
- **RTP:** 85-90% (retorno teórico)
- **Probabilidades:** Triple 0.7-1.2%, Double 3-5%, Jackpot 0.008-0.015%
- **Multiplicadores:** Triple 2.5-4.5x, Double 1.0-1.4x, Jackpot 10-25x
- **Apuestas:** $100-$5000
- **Juegos:** 7 temas diferentes

## Game Session Isolation
- Cada botón incluye el UID del jugador en su customId (ej: `bj_deal_${uid}`)
- Las sesiones de juego se almacenan en Maps independientes por usuario
- Las respuestas privadas (`deferReply({ flags: 64 })`) aseguran visualización exclusiva
- Múltiples jugadores pueden jugar simultáneamente sin interferencias

## Environment Variables
- `DISCORD_BOT_TOKEN` (required): Your Discord bot token

## Database Files
All data is stored in the `data/` directory:
- `economy.db` - User balances and transactions
- `giveaways.db` - Giveaway data and winners
- `sports.db` - Sports events and bets
- `insidetrack.db` - Race data and bets

## Anuncios Automáticos

El sistema `/startanuncios` envía embeds promocionales que se actualizan cada 10 minutos:

**8 Mensajes Aleatorios:**
1. 🍀 Bienvenida al casino (general)
2. 🥊 Invitación a boxeo
3. ⚽ Invitación a futbol
4. 🏆 Promoción de premios
5. 🎰 Promoción de slots
6. 🍀 Promoción de blackjack/ruleta/poker
7. 🐴 Promoción de Inside Track
8. 💎 Mensaje premium sobre el casino

**Cada anuncio incluye:**
- Embed con título y descripción
- Botón "⚡ Ir a Apostar" hacia canal de soporte
- Link al canal de recargas de saldo
- Actualización automática cada 10 minutos

**Uso:**
```
/startanuncios canal:#anuncios
```

## Notes
- All admin commands are ephemeral (only visible to admin)
- User messages with commands are automatically hidden
- Databases auto-save every 60 seconds
- All financial data is private to admins
- Casino games use private ephemeral responses for player isolation
- All probabilities are mathematically verified and enforced at runtime
- Anuncios se actualizan sin recrear el mensaje (editan el existente)
