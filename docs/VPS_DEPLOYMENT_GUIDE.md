# VPS Deployment Guide

## Prerequisites

**VPS Requirements:**

- Ubuntu 20.04 LTS o superior (o Debian similar)
- Mínimo 2GB RAM (recomendado 4GB)
- Mínimo 20GB disco (recomendado 40GB)
- Acceso SSH con usuario sudo
- PostgreSQL 14 o superior
- Node.js 18 LTS o superior

**Software requerido:**

- Git
- Node.js + npm
- PostgreSQL
- Nginx (opcional, recomendado para producción)
- PM2 (para gestión de procesos)
- Certbot (para SSL con Let's Encrypt)

## Paso 1: Preparar el VPS

### Actualizar sistema

```bash
sudo apt update
sudo apt upgrade -y
```

### Instalar dependencias base

```bash
sudo apt install -y git curl wget build-essential
```

### Instalar Node.js (usando nvm o NodeSource)

**Opción A: Usar nvm (recomendado)**

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
nvm alias default 18
```

**Opción B: Usar NodeSource**

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### Instalar PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Crear base de datos y usuario

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE sistema_freire;
CREATE USER sistema_freire_user WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE sistema_freire TO sistema_freire_user;
\q
```

### Instalar PM2

```bash
sudo npm install -g pm2
pm2 startup
```

### Instalar Nginx

```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

## Paso 2: Clonar y Configurar el Proyecto

### Crear usuario dedicado (opcional pero recomendado)

```bash
sudo adduser sistema
sudo usermod -aG sudo sistema
su - sistema
```

### Clonar repositorio

```bash
cd /home/sistema
git clone https://github.com/gustavo180591/sistema-freire.git
cd sistema-freire
```

### Instalar dependencias

```bash
npm install
```

### Configurar variables de entorno

```bash
cp .env.example .env
nano .env
```

**Variables a configurar:**

```env
DATABASE_URL="postgresql://sistema_freire_user:secure_password_here@localhost:5432/sistema_freire"
SESSION_SECRET="generar_un_secret_aleatorio_seguro_aqui"
TOTP_SECRET="generar_un_secret_aleatorio_seguro_aqui"
NODE_ENV="production"
```

**Generar secrets seguros:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Paso 3: Base de Datos

### Aplicar migraciones

```bash
npx prisma migrate deploy
```

### Verificar estado

```bash
npx prisma migrate status
```

Debe mostrar: "Database schema is up to date"

### Ejecutar seed inicial

```bash
npx tsx prisma/seed-locations.ts
```

Esto creará las sedes Leandro N. Alem y Capiovi.

### Crear usuario SUPERADMIN

```bash
npx tsx prisma/seed-users.ts
```

O crear manualmente desde la UI una vez que el sistema esté corriendo.

## Paso 4: Build del Proyecto

### Compilar para producción

```bash
npm run build
```

### Verificar que build fue exitoso

Debe crear el directorio `.svelte-kit/output` sin errores.

## Paso 5: Configurar Storage

### Crear directorios necesarios

```bash
mkdir -p storage/private
mkdir -p static/uploads
mkdir -p logs
```

### Configurar permisos

```bash
chmod 750 storage/private
chmod 755 static/uploads
chmod 750 logs
```

## Paso 6: Configurar PM2

### Crear archivo de configuración

```bash
pm2 init
```

Editar `ecosystem.config.js`:

```javascript
module.exports = {
	apps: [
		{
			name: 'sistema-freire',
			script: 'node',
			args: 'build/index.js',
			cwd: '/home/sistema/sistema-freire',
			env: {
				NODE_ENV: 'production',
				PORT: 3000
			},
			instances: 1,
			autorestart: true,
			watch: false,
			max_memory_restart: '1G',
			error_file: '/home/sistema/sistema-freire/logs/pm2-error.log',
			out_file: '/home/sistema/sistema-freire/logs/pm2-out.log',
			log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
		}
	]
};
```

### Iniciar aplicación

```bash
pm2 start ecosystem.config.js
pm2 save
```

### Verificar estado

```bash
pm2 status
pm2 logs sistema-freire
```

## Paso 7: Configurar Nginx

### Crear configuración de sitio

```bash
sudo nano /etc/nginx/sites-available/sistema-freire
```

```nginx
server {
    listen 80;
    server_name tu-dominio.com;  # Reemplazar con tu dominio

    root /home/sistema/sistema-freire/static;
    index index.html;

    # Logs
    access_log /var/log/nginx/sistema-freire-access.log;
    error_log /var/log/nginx/sistema-freire-error.log;

    # Proxy a la aplicación
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Archivos estáticos
    location /static/ {
        alias /home/sistema/sistema-freire/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Aumentar límites para uploads
    client_max_body_size 10M;
}
```

### Habilitar sitio

```bash
sudo ln -s /etc/nginx/sites-available/sistema-freire /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Paso 8: Configurar SSL (Let's Encrypt)

### Instalar Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Obtener certificado

```bash
sudo certbot --nginx -d tu-dominio.com
```

Seguir las instrucciones. Certbot configurará Nginx automáticamente.

### Renovación automática

Certbot configura renovación automática. Verificar:

```bash
sudo certbot renew --dry-run
```

## Paso 9: Configurar Firewall

### Usar UFW

```bash
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```

## Paso 10: Configurar Backups

### Backup de base de datos

Crear script `/home/sistema/scripts/backup-db.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/home/sistema/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/sistema_freire_$DATE.sql"

mkdir -p $BACKUP_DIR

pg_dump -U sistema_freire_user sistema_freire > $BACKUP_FILE

# Comprimir
gzip $BACKUP_FILE

# Mantener solo últimos 7 días
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

Dar permisos:

```bash
chmod +x /home/sistema/scripts/backup-db.sh
```

### Configurar cron para backup diario

```bash
crontab -e
```

Agregar:

```
0 2 * * * /home/sistema/scripts/backup-db.sh
```

### Backup de storage

```bash
rsync -avz /home/sistema/sistema-freire/storage/ /home/sistema/backups/storage/
```

## Paso 11: Verificar Despliegue

### Verificar que la aplicación corre

```bash
curl http://localhost:3000
```

### Verificar logs

```bash
pm2 logs sistema-freire
```

### Verificar Nginx

```bash
sudo nginx -t
sudo systemctl status nginx
```

### Verificar SSL

Visitar `https://tu-dominio.com` y verificar certificado.

## Paso 12: Monitoreo Básico

### Instalar herramientas de monitoreo

```bash
sudo apt install -y htop iotop
```

### Configurar alertas de disco

```bash
sudo apt install -y mailutils
```

## Troubleshooting

### La aplicación no inicia

Verificar logs de PM2:

```bash
pm2 logs sistema-freire --lines 100
```

Verificar que la base de datos está accesible:

```bash
psql -U sistema_freire_user -d sistema_freire -c "SELECT 1"
```

### Error de conexión a base de datos

Verificar `DATABASE_URL` en `.env`

Verificar que PostgreSQL está corriendo:

```bash
sudo systemctl status postgresql
```

### Error de permisos

Verificar permisos de directorios:

```bash
ls -la storage/
ls -la static/
```

### Nginx retorna 502

Verificar que PM2 está corriendo:

```bash
pm2 status
```

Verificar que el puerto 3000 está escuchando:

```bash
netstat -tlnp | grep 3000
```

### SSL no funciona

Verificar configuración de Nginx:

```bash
sudo nginx -t
```

Verificar logs de Nginx:

```bash
sudo tail -f /var/log/nginx/sistema-freire-error.log
```

## Mantenimiento

### Actualizar aplicación

```bash
cd /home/sistema/sistema-freire
git pull
npm install
npm run build
pm2 restart sistema-freire
```

### Actualizar migraciones

```bash
npx prisma migrate deploy
```

### Reiniciar servicios

```bash
pm2 restart sistema-freire
sudo systemctl reload nginx
```

## Seguridad Adicional

### Deshabilitar login root SSH

Editar `/etc/ssh/sshd_config`:

```
PermitRootLogin no
```

Reiniciar SSH:

```bash
sudo systemctl restart sshd
```

### Configurar fail2ban

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## Contacto de Soporte

Para problemas de despliegue, revisar:

- Logs de PM2: `/home/sistema/sistema-freire/logs/`
- Logs de Nginx: `/var/log/nginx/`
- Logs de aplicación: Ver PM2 logs
