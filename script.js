const map = L.map('map').setView([52.52, 13.41], 10);
    let marker = L.marker([52.52, 13.41]).addTo(map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    const latitudeInput = document.getElementById('latitude');
    const longitudeInput = document.getElementById('longitude');
    const consultarBtn = document.getElementById('consultarBtn');
    const loadingElement = document.getElementById('loading');
    const errorElement = document.getElementById('error');
    const coordsDisplay = document.getElementById('coordsDisplay');
    const locationInfo = document.getElementById('locationInfo');

    map.on('click', function(e) {
        const { lat, lng } = e.latlng;
        
        latitudeInput.value = lat.toFixed(6);
        longitudeInput.value = lng.toFixed(6);

        map.removeLayer(marker);
        marker = L.marker([lat, lng]).addTo(map);

        updateCoordsDisplay(lat, lng);
    });
    latitudeInput.addEventListener('change', updateMapFromInputs);
    longitudeInput.addEventListener('change', updateMapFromInputs);

    function updateMapFromInputs() {
        const lat = parseFloat(latitudeInput.value);
        const lng = parseFloat(longitudeInput.value);

        if (!isNaN(lat) && !isNaN(lng)) {
            map.setView([lat, lng], 10);
            map.removeLayer(marker);
            marker = L.marker([lat, lng]).addTo(map);
            updateCoordsDisplay(lat, lng);
        }
    }

    function updateCoordsDisplay(lat, lng) {
        coordsDisplay.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }

    const ctx = document.getElementById('temperatureChart').getContext('2d');
    let temperatureChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Temperatura (°C)',
                data: [],
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Temperatura (°C)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Hora do Dia'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Variação de Temperatura - 24 Horas',
                    font: {
                        size: 16
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Temperatura: ${context.parsed.y}°C`;
                        }
                    }
                }
            }
        }
    });
    async function consultarTemperatura() {
        const latitude = latitudeInput.value;
        const longitude = longitudeInput.value;

        if (!latitude || !longitude) {
            showError('Por favor, informe latitude e longitude.');
            return;
        }

        const hoje = new Date().toISOString().split('T')[0];

        try {
            showLoading(true);
            hideError();

            const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m&start_date=${hoje}&end_date=${hoje}&timezone=auto`;

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('Erro ao buscar dados da API');
            }

            const data = await response.json();

            if (!data.hourly || !data.hourly.temperature_2m) {
                throw new Error('Dados de temperatura não disponíveis para esta localização');
            }

            processarDadosTemperatura(data);

        } catch (error) {
            showError(`Erro: ${error.message}`);
        } finally {
            showLoading(false);
        }
    }
    function processarDadosTemperatura(data) {
        const { time, temperature_2m } = data.hourly;

        const horas = time.map(t => {
            const data = new Date(t);
            return data.getHours().toString().padStart(2, '0') + ':00';
        });

        temperatureChart.data.labels = horas;
        temperatureChart.data.datasets[0].data = temperature_2m;
        temperatureChart.update();

        const tempMin = Math.min(...temperature_2m);
        const tempMax = Math.max(...temperature_2m);
        const tempMedia = (temperature_2m.reduce((a, b) => a + b, 0) / temperature_2m.length).toFixed(1);

        locationInfo.innerHTML = `
            📍 Localização: ${latitudeInput.value}, ${longitudeInput.value} | 
            🌡️ Mín: ${tempMin}°C | Máx: ${tempMax}°C | Média: ${tempMedia}°C
        `;
    }
    function showLoading(show) {
        loadingElement.style.display = show ? 'block' : 'none';
        consultarBtn.disabled = show;
    }
    function showError(message) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
    function hideError() {
        errorElement.style.display = 'none';
    }
    consultarBtn.addEventListener('click', consultarTemperatura);
    window.addEventListener('load', function() {
        setTimeout(consultarTemperatura, 1000);
    });
