document.addEventListener('DOMContentLoaded', async () => {
    // Verifica o status de login para ajustar o botão
    try {
        const authResponse = await fetch('/api/auth/status');
        const authStatus = await authResponse.json();
        const playAgainButton = document.querySelector('.btn-jogar-novamente');

        if (authStatus.loggedIn) {
            playAgainButton.href = '/index.html';
        } else {
            playAgainButton.href = '/login.html';
        }
    } catch (error) {
        console.error('Erro ao verificar status de autenticação:', error);
        // Fallback para a tela de login se a verificação falhar
        document.querySelector('.btn-jogar-novamente').href = '/login.html';
    }

    // Carrega o placar de pontuações
    try {
        const scoresResponse = await fetch('/api/scores');
        if (!scoresResponse.ok) {
            throw new Error('Não foi possível carregar o placar.');
        }
        const scores = await scoresResponse.json();
        const scoreboardBody = document.querySelector('#scoreboard tbody');

        if (scores.length > 0) {
            scoreboardBody.innerHTML = ''; // Limpa o corpo da tabela antes de adicionar novas linhas
            scores.forEach((score, index) => {
                const row = `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${score.username}</td>
                        <td>${score.score}</td>
                        <td>${new Date(score.created_at).toLocaleDateString()}</td>
                    </tr>
                `;
                scoreboardBody.innerHTML += row;
            });
        } else {
            scoreboardBody.innerHTML = '<tr><td colspan="4">Nenhuma pontuação registrada ainda.</td></tr>';
        }
    } catch (error) {
        console.error('Erro ao buscar pontuações:', error);
        document.querySelector('#scoreboard tbody').innerHTML = '<tr><td colspan="4">Erro ao carregar o placar.</td></tr>';
    }
});