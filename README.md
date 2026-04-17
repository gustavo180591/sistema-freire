npx sv create my-app

Tailwind CSS 4
npx sv add tailwindcss
npm i @tailwindcss/forms @tailwindcss/typography

Validación de datos
npm i zod
npm i zod-form-data

ORM y base de datos
npm i -D prisma@6
npm i @prisma/client@6
npx prisma init

Auth (si tu sistema tendrá login)
npm i @auth/sveltekit

Testing
npm i -D vitest
npx playwright install

Calidad de código
npm i -D eslint prettier husky lint-staged
npm i -D @commitlint/cli @commitlint/config-conventional

Variables de entorno
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/app"

docker-compose up -d
docker-compose up --build -d
docker-compose ps
docker-compose logs -f

armar el schema.prisma con los modelos necesarios

npx prisma migrate dev --name init
Cuando hacés cambios en el schema, ejecuta:
npx prisma migrate dev --name <nombre_del_migration>
👉 siempre cambiá el nombre según lo que hiciste:

add-products
add-stock
add-suppliers

Generar cliente manualmente
npx prisma generate
