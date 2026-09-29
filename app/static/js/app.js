document.addEventListener("DOMContentLoaded", () => {
    const CITY_TOLERANCE_MILES = 50;
    const SCORE_BY_ATTEMPT = [100, 70, 40];
    const MAP_DATA_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";
    const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const TRANSITION_DELAY_MS = REDUCED_MOTION ? 100 : 1000;
    const elements = Object.fromEntries([
        "start-screen", "start-quiz", "start-error", "game-header", "question-panel", "question-city",
        "question-number", "score", "score-flash", "timer", "progress-count", "progress-fill",
        "map-card", "map-controls", "us-map", "map-status", "game-feedback", "feedback-title", "feedback-detail",
        "results-panel", "final-score", "final-percent", "final-time", "review-panel", "review-detail",
        "play-again", "review-map", "back-to-results", "zoom-in", "zoom-out", "zoom-reset",
    ].map((id) => [id, document.getElementById(id)]));
    const game = {
        phase: "ready",
        cities: [],
        cityCount: 0,
        maxScore: 0,
        questionIndex: 0,
        attempts: 0,
        score: 0,
        results: [],
        startedAt: null,
        finishedAt: null,
        timerId: null,
        transitionId: null,
        markerTimeouts: new Set(),
        guessingEnabled: false,
        toleranceMiles: CITY_TOLERANCE_MILES,
        mapPromise: null,
        svg: null,
        viewport: null,
        targetLayer: null,
        rippleLayer: null,
        markerLayer: null,
        projection: null,
        zoom: null,
    };

    elements["start-quiz"].addEventListener("click", startQuiz);
    elements["play-again"].addEventListener("click", resetQuiz);
    elements["review-map"].addEventListener("click", showReviewMap);
    elements["back-to-results"].addEventListener("click", () => {
        game.phase = "results";
        elements["review-panel"].hidden = true;
        elements["results-panel"].hidden = false;
        elements["map-card"].hidden = true;
        elements["map-controls"].hidden = true;
    });
    elements["zoom-in"].addEventListener("click", () => zoomMap(1.4));
    elements["zoom-out"].addEventListener("click", () => zoomMap(1 / 1.4));
    elements["zoom-reset"].addEventListener("click", resetMapView);

    async function startQuiz() {
        if (game.phase === "loading" || game.phase === "playing") return;
        game.phase = "loading";
        elements["start-quiz"].disabled = true;
        elements["start-error"].hidden = true;
        elements["map-card"].hidden = false;
        setMapStatus("Loading the state map...");
        try {
            const [response] = await Promise.all([fetch("/api/quiz"), loadMap()]);
            if (!response.ok) throw new Error("The quiz could not be loaded.");
            const data = await response.json();
            if (!Array.isArray(data.cities) || data.cities.length !== data.cityCount || !data.cityCount) {
                throw new Error("The quiz data is incomplete. Please try again.");
            }
            game.cities = data.cities;
            game.cityCount = data.cityCount;
            game.maxScore = data.maxScore;
            game.toleranceMiles = Number(data.toleranceMiles) || CITY_TOLERANCE_MILES;
            game.questionIndex = 0;
            game.attempts = 0;
            game.score = 0;
            game.results = [];
            game.startedAt = Date.now();
            game.finishedAt = null;
            clearFeedbackTimers();
            renderTargetDots();
            resetMapView();
            elements["start-screen"].hidden = true;
            elements["results-panel"].hidden = true;
            elements["review-panel"].hidden = true;
            elements["game-header"].hidden = false;
            elements["question-panel"].hidden = false;
            elements["game-feedback"].hidden = false;
            elements["map-status"].hidden = true;
            elements["map-card"].hidden = false;
            elements["map-controls"].hidden = false;
            game.phase = "playing";
            updateScore();
            updateProgress();
            updateTimer();
            game.timerId = window.setInterval(updateTimer, 250);
            nextQuestion();
        } catch (error) {
            game.phase = "ready";
            elements["map-card"].hidden = true;
            elements["map-controls"].hidden = true;
            elements["start-error"].textContent = error.message || "The map could not be loaded. Check your connection and try again.";
            elements["start-error"].hidden = false;
        } finally {
            elements["start-quiz"].disabled = false;
        }
    }

    function loadMap() {
        if (!game.mapPromise) {
            game.mapPromise = (async () => {
                if (!window.d3 || !window.topojson) throw new Error("Map tools did not load. Refresh the page and try again.");
                const response = await fetch(MAP_DATA_URL);
                if (!response.ok) throw new Error("State boundary data could not be loaded.");
                const topology = await response.json();
                const states = topojson.feature(topology, topology.objects.states).features
                    .filter((feature) => Number(feature.id) >= 1 && Number(feature.id) <= 56);
                if (states.length < 50) throw new Error("The state boundary data is incomplete.");
                initializeMap(states);
            })().catch((error) => {
                game.mapPromise = null;
                throw error;
            });
        }
        return game.mapPromise;
    }

    function initializeMap(states) {
        game.svg = d3.select(elements["us-map"]);
        game.viewport = game.svg.append("g").attr("class", "map-viewport");
        const extent = [[26, 22], [974, 618]];
        game.projection = d3.geoAlbersUsa().fitExtent(extent, { type: "FeatureCollection", features: states });
        const path = d3.geoPath(game.projection);
        game.viewport.append("g").attr("class", "state-layer")
            .selectAll("path").data(states).join("path")
            .attr("class", "state-shape")
            .attr("d", path)
            .attr("fill", (_, index) => index % 3 === 0 ? "#29483f" : index % 3 === 1 ? "#304d43" : "#2b493f");
        game.targetLayer = game.viewport.append("g").attr("class", "target-layer");
        game.rippleLayer = game.viewport.append("g").attr("class", "ripple-layer");
        game.markerLayer = game.viewport.append("g").attr("class", "marker-layer");
        game.zoom = d3.zoom().scaleExtent([1, 8]).on("zoom", (event) => {
            game.viewport.attr("transform", event.transform);
        });
        game.svg.call(game.zoom).on("click", handleMapClick);
        game.svg.on("dblclick.zoom", null);
    }

    function nextQuestion() {
        if (game.questionIndex >= game.cities.length) {
            finishQuiz();
            return;
        }
        game.attempts = 0;
        game.guessingEnabled = true;
        const city = game.cities[game.questionIndex];
        elements["question-city"].textContent = city.name.toUpperCase();
        elements["question-number"].textContent = String(game.questionIndex + 1).padStart(2, "0");
        elements["feedback-title"].textContent = "3 chances";
        elements["feedback-detail"].textContent = "Tap the map to place your guess.";
        updateAttemptDots();
        elements["question-panel"].classList.remove("question-enter");
        void elements["question-panel"].offsetWidth;
        elements["question-panel"].classList.add("question-enter");
    }

    function handleMapClick(event) {
        if (game.phase !== "playing" || !game.guessingEnabled || event.defaultPrevented) return;
        const [screenX, screenY] = d3.pointer(event, elements["us-map"]);
        const [mapX, mapY] = d3.zoomTransform(elements["us-map"]).invert([screenX, screenY]);
        const location = game.projection.invert([mapX, mapY]);
        if (!location || !location.every(Number.isFinite)) return;
        checkGuess({ latitude: location[1], longitude: location[0] });
    }

    function checkGuess(guess) {
        if (!game.guessingEnabled || game.phase !== "playing") return;
        const city = game.cities[game.questionIndex];
        const isCorrect = distanceMiles(guess, city) <= game.toleranceMiles;
        game.attempts += 1;
        const clickedCity = findNearestCity(guess);
        const chancesLeft = Math.max(0, 3 - game.attempts);
        const clickMessage = isCorrect
            ? "Correct!"
            : `${chancesLeft} ${chancesLeft === 1 ? "chance" : "chances"} left`;
        showClickRipple(clickedCity, isCorrect, clickMessage);
        if (isCorrect) {
            const points = SCORE_BY_ATTEMPT[game.attempts - 1];
            const performance = ["first", "second", "third"][game.attempts - 1];
            game.score += points;
            game.results.push({ ...city, performance, attempts: game.attempts, points });
            elements["feedback-title"].textContent = "Correct!";
            elements["feedback-detail"].textContent = `+${points} points`;
            showCorrectLocation(city, performance);
            showScoreAward(points);
            completeQuestion();
            return;
        }

        if (game.attempts === 3) {
            game.results.push({ ...city, performance: "missed", attempts: 3, points: 0 });
            elements["feedback-title"].textContent = "Location revealed";
            elements["feedback-detail"].textContent = city.name;
            showCorrectLocation(city, "missed");
            completeQuestion();
            return;
        }
        elements["feedback-title"].textContent = "Not quite!";
        elements["feedback-detail"].textContent = game.attempts === 1 ? "2 chances remaining" : "Last chance!";
        updateAttemptDots();
    }

    function showCorrectLocation(city, performance) {
        const point = game.projection([city.longitude, city.latitude]);
        if (!point) return;
        game.targetLayer.selectAll("circle").filter((target) => target.name === city.name).remove();
        const marker = game.markerLayer.append("g")
            .attr("class", `city-marker ${performance} marker-pop`)
            .attr("transform", `translate(${point[0]},${point[1]})`)
            .attr("aria-label", `${city.name}, ${city.state}`);
        marker.append("circle").attr("class", "marker-core").attr("r", 5.5);
        marker.append("circle").attr("class", "marker-pulse").attr("r", 6);
        marker.append("text").attr("class", "marker-label").attr("x", 9).attr("y", -8).text(city.name);
        const timeout = window.setTimeout(() => {
            marker.classed("marker-pop", false);
            game.markerTimeouts.delete(timeout);
        }, 1100);
        game.markerTimeouts.add(timeout);
    }

    function renderTargetDots() {
        game.targetLayer.selectAll("*").remove();
        game.targetLayer.selectAll("circle").data(game.cities).join("circle")
            .attr("class", "city-target-dot")
            .attr("cx", (city) => game.projection([city.longitude, city.latitude])[0])
            .attr("cy", (city) => game.projection([city.longitude, city.latitude])[1])
            .attr("r", 5.5);
    }

    function findNearestCity(guess) {
        let nearestCity = null;
        let nearestDistance = Infinity;
        game.cities.forEach((city) => {
            const distance = distanceMiles(guess, city);
            if (distance < nearestDistance) {
                nearestCity = city;
                nearestDistance = distance;
            }
        });
        return nearestCity;
    }

    function showClickRipple(city, isCorrect, message) {
        if (!city) return;
        const point = game.projection([city.longitude, city.latitude]);
        if (!point) return;
        const ripple = game.rippleLayer.append("g")
            .attr("class", `click-ripple ${isCorrect ? "is-correct" : "is-wrong"}`)
            .attr("transform", `translate(${point[0]},${point[1]})`);
        ripple.selectAll("circle").data(["ring-one", "ring-two", "ring-three"]).join("circle")
            .attr("class", (ring) => `click-ring ${ring}`)
            .attr("r", 15);
        ripple.append("text")
            .attr("class", "click-feedback-label")
            .attr("y", -23)
            .text(message);
        const timeout = window.setTimeout(() => {
            ripple.remove();
            game.markerTimeouts.delete(timeout);
        }, 1000);
        game.markerTimeouts.add(timeout);
    }

    function completeQuestion() {
        game.guessingEnabled = false;
        updateScore();
        updateProgress();
        updateAttemptDots();
        if (game.results.length === game.cityCount) {
            game.finishedAt = Date.now();
            window.clearInterval(game.timerId);
            game.timerId = null;
            updateTimer();
            game.transitionId = window.setTimeout(finishQuiz, TRANSITION_DELAY_MS);
            return;
        }
        game.transitionId = window.setTimeout(() => {
            game.questionIndex += 1;
            nextQuestion();
        }, TRANSITION_DELAY_MS);
    }

    function updateScore() {
        elements.score.textContent = game.score.toLocaleString("en-US");
    }

    function showScoreAward(points) {
        elements["score-flash"].textContent = `+${points}`;
        elements["score-flash"].classList.remove("score-flash-show");
        void elements["score-flash"].offsetWidth;
        elements["score-flash"].classList.add("score-flash-show");
    }

    function updateProgress() {
        const completed = game.results.length;
        elements["progress-count"].textContent = completed;
        elements["progress-fill"].style.width = `${(completed / game.cityCount) * 100}%`;
        elements["progress-fill"].parentElement.setAttribute("aria-valuenow", String(completed));
    }

    function updateAttemptDots() {
        const remaining = Math.max(0, 3 - game.attempts);
        document.querySelectorAll(".attempt-dots i").forEach((dot, index) => {
            dot.classList.toggle("spent", index >= remaining);
        });
    }

    function updateTimer() {
        const now = game.finishedAt || Date.now();
        elements.timer.textContent = formatTime(Math.floor((now - game.startedAt) / 1000));
    }

    function finishQuiz() {
        if (game.phase === "results") return;
        game.phase = "results";
        game.guessingEnabled = false;
        game.finishedAt = game.finishedAt || Date.now();
        window.clearInterval(game.timerId);
        game.timerId = null;
        updateTimer();
        elements["game-header"].hidden = true;
        elements["question-panel"].hidden = true;
        elements["game-feedback"].hidden = true;
        elements["map-card"].hidden = true;
        elements["map-controls"].hidden = true;
        elements["review-panel"].hidden = true;
        elements["results-panel"].hidden = false;
        elements["final-score"].textContent = game.score.toLocaleString("en-US");
        elements["final-percent"].textContent = `${((game.score / game.maxScore) * 100).toFixed(1)}%`;
        elements["final-time"].textContent = formatTime(Math.floor((game.finishedAt - game.startedAt) / 1000));
        updateResultsBreakdown();
        elements["results-panel"].classList.remove("results-enter");
        void elements["results-panel"].offsetWidth;
        elements["results-panel"].classList.add("results-enter");
    }

    function updateResultsBreakdown() {
        const counts = { first: 0, second: 0, third: 0, missed: 0 };
        game.results.forEach((result) => { counts[result.performance] += 1; });
        Object.entries(counts).forEach(([key, count]) => {
            document.getElementById(`count-${key}`).textContent = count;
            document.getElementById(`bar-${key}`).style.width = `${(count / game.cityCount) * 100}%`;
        });
    }

    function showReviewMap() {
        game.phase = "review";
        elements["results-panel"].hidden = true;
        elements["review-panel"].hidden = false;
        elements["map-card"].hidden = false;
        elements["map-controls"].hidden = false;
        elements["review-detail"].textContent = "Select a city marker to see how you did.";
        renderReviewMarkers();
    }

    function renderReviewMarkers() {
        game.markerLayer.selectAll("*").remove();
        game.targetLayer.selectAll("*").remove();
        game.markerLayer.selectAll("g").data(game.results).join("g")
            .attr("class", (city) => `city-marker review-marker ${city.performance}`)
            .attr("transform", (city) => {
                const point = game.projection([city.longitude, city.latitude]);
                return `translate(${point[0]},${point[1]})`;
            })
            .attr("tabindex", 0)
            .attr("role", "button")
            .attr("aria-label", (city) => `${city.name}, ${city.state}, ${city.performance} attempt`)
            .on("click keydown", (event, city) => {
                if (event.type === "keydown" && event.key !== "Enter" && event.key !== " ") return;
                event.stopPropagation();
                if (event.type === "keydown") event.preventDefault();
                showReviewDetails(city);
            })
            .each(function (city) {
                const marker = d3.select(this);
                marker.append("circle").attr("class", "marker-core").attr("r", 5.5);
                marker.append("text").attr("class", "marker-label").attr("x", 9).attr("y", -8).text(`${city.name}, ${city.state}`);
            });
    }

    function showReviewDetails(city) {
        const performance = {
            first: "First attempt",
            second: "Second attempt",
            third: "Third attempt",
            missed: "Location revealed",
        }[city.performance];
        const chance = city.attempts === 1 ? "attempt" : "attempts";
        elements["review-detail"].textContent = `${city.name}, ${city.state} | ${performance} | ${city.attempts} ${chance} | ${city.points} points`;
    }

    function resetQuiz() {
        window.clearInterval(game.timerId);
        game.timerId = null;
        clearFeedbackTimers();
        game.phase = "ready";
        game.cities = [];
        game.questionIndex = 0;
        game.attempts = 0;
        game.score = 0;
        game.results = [];
        game.startedAt = null;
        game.finishedAt = null;
        game.guessingEnabled = false;
        updateScore();
        updateProgress();
        updateAttemptDots();
        if (game.markerLayer) game.markerLayer.selectAll("*").remove();
        if (game.targetLayer) game.targetLayer.selectAll("*").remove();
        elements["game-header"].hidden = true;
        elements["question-panel"].hidden = true;
        elements["game-feedback"].hidden = true;
        elements["map-card"].hidden = true;
        elements["map-controls"].hidden = true;
        elements["results-panel"].hidden = true;
        elements["review-panel"].hidden = true;
        elements["start-screen"].hidden = false;
        elements["score-flash"].textContent = "";
        elements["timer"].textContent = "00:00";
        elements["start-error"].hidden = true;
        elements["start-quiz"].disabled = false;
        resetMapView();
    }

    function resetMapView() {
        if (game.svg && game.zoom) {
            game.svg.interrupt().call(game.zoom.transform, d3.zoomIdentity);
        }
    }

    function zoomMap(factor) {
        if (game.svg && game.zoom) {
            game.svg.transition().duration(REDUCED_MOTION ? 0 : 220).call(game.zoom.scaleBy, factor);
        }
    }

    function setMapStatus(message) {
        elements["map-status"].textContent = message;
        elements["map-status"].hidden = false;
    }

    function clearFeedbackTimers() {
        window.clearTimeout(game.transitionId);
        game.transitionId = null;
        game.markerTimeouts.forEach((timeout) => window.clearTimeout(timeout));
        game.markerTimeouts.clear();
    }

    function distanceMiles(first, second) {
        const radians = (degrees) => degrees * (Math.PI / 180);
        const latitudeDelta = radians(second.latitude - first.latitude);
        const longitudeDelta = radians(second.longitude - first.longitude);
        const latitudeOne = radians(first.latitude);
        const latitudeTwo = radians(second.latitude);
        const haversine = Math.sin(latitudeDelta / 2) ** 2
            + Math.cos(latitudeOne) * Math.cos(latitudeTwo) * Math.sin(longitudeDelta / 2) ** 2;
        return 3958.8 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
    }
});