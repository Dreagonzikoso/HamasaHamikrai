document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/scores');
        if (!response.ok) {
            throw new Error('Não foi possível carregar o placar.');
        }
        const scores = await response.json();
        const scoreboardBody = document.querySelector('#scoreboard tbody');

        if (scores.length > 0) {
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
    }
});