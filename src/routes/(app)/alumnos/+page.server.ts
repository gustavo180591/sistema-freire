export async function load() {
	return {
		students: [
			{
				id: '1',
				userId: 'user1',
				dni: '12345678',
				firstName: 'Juan',
				lastName: 'Pérez',
				email: 'juan.perez@email.com',
				career: 'Lengua',
				careerId: 'career1',
				status: 'ACTIVE',
				isBecado: false,
				isRecursante: false,
				createdAt: new Date()
			},
			{
				id: '2',
				userId: 'user2',
				dni: '87654321',
				firstName: 'María',
				lastName: 'González',
				email: 'maria.gonzalez@email.com',
				career: 'Matemáticas',
				careerId: 'career2',
				status: 'ACTIVE',
				isBecado: true,
				isRecursante: false,
				createdAt: new Date()
			}
		]
	};
}
