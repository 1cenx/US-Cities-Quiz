document.addEventListener("DOMContentLoaded", () => {
    const elements = {
        map: document.getElementById("waterway-map"),
        mapStatus: document.getElementById("map-status"),
        offshoreLayer: d3.select("#offshore-layer"),
        countryLayer: d3.select("#country-layer"),
        countryBoundariesLayer: d3.select("#country-boundaries-layer"),
        waterwayLayer: d3.select("#waterway-layer"),
        landLayer: d3.select("#land-layer"),
        alaskaLayer: d3.select("#alaska-layer"),
        form: document.getElementById("answer-form"),
        input: document.getElementById("answer-input"),
        submit: document.getElementById("submit-answer"),
        title: document.getElementById("answer-title"),
        hint: document.getElementById("answer-hint"),
        panelOverline: document.getElementById("panel-overline"),
        selectionStatus: document.getElementById("selection-status"),
        feedback: document.getElementById("feedback"),
        attemptDots: [...document.querySelectorAll(".attempt-dots i")],
        index: document.getElementById("location-index"),
        indexPanel: document.getElementById("index-panel"),
        modeIdentify: document.getElementById("mode-identify"),
        modeLocate: document.getElementById("mode-locate"),
        progress: document.getElementById("progress-count"),
        progressFill: document.getElementById("progress-fill"),
        progressTrack: document.querySelector(".progress-track[role='progressbar']"),
        correctCount: document.getElementById("correct-count"),
        missedCount: document.getElementById("missed-count"),
    };
    const game = {
        waterways: [],
        selectedId: null,
        activeId: null,
        hoveredId: null,
        mode: "identify",
        questionOrder: [],
        questionIndex: 0,
        transitionTimer: null,
        shapes: null,
        indexButtons: null,
    };

    elements.form.addEventListener("submit", submitAnswer);
    elements.modeIdentify.addEventListener("click", () => setMode("identify"));
    elements.modeLocate.addEventListener("click", () => setMode("locate"));
    initialize();

    async function initialize() {
        try {
            const quizResponse = await fetch("/api/quiz");
            if (!quizResponse.ok) throw new Error("Quiz locations could not be loaded.");
            const quiz = await quizResponse.json();
            if (!Array.isArray(quiz.waterways) || quiz.waterways.length !== quiz.waterwayCount) {
                throw new Error("The location list is incomplete.");
            }
            game.waterways = quiz.waterways.map((waterway, index) => ({
                ...waterway,
                number: index + 1,
                attempts: 0,
                status: "open",
            }));
            renderIndex();

            try {
                const [mapResponse, featuresResponse] = await Promise.all([
                    fetch("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"),
                    fetch("/static/data/map-features.geojson"),
                ]);
                if (!mapResponse.ok || !featuresResponse.ok || !window.topojson || !window.d3) {
                    throw new Error("Map unavailable. Use the numbered location index below.");
                }
                const [topology, featureCollection] = await Promise.all([mapResponse.json(), featuresResponse.json()]);
                renderMap(topology, featureCollection.features);
            } catch {
                elements.mapStatus.textContent = "Map unavailable. Use the numbered location index below.";
                elements.mapStatus.hidden = false;
            }
        } catch (error) {
            elements.mapStatus.textContent = error.message || "The quiz could not be loaded. Refresh to try again.";
            elements.mapStatus.hidden = false;
            elements.feedback.textContent = "Quiz data is unavailable.";
        }
    }

    function renderMap(topology, mapFeatures) {
        const states = topojson.feature(topology, topology.objects.states).features
            .filter((feature) => Number(feature.id) >= 1 && Number(feature.id) <= 56);
        const alaska = states.find((feature) => Number(feature.id) === 2);
        const mainland = states.filter((feature) => Number(feature.id) !== 2 && Number(feature.id) !== 15);
        const mainlandCollection = { type: "FeatureCollection", features: mainland };
        const mainlandProjection = d3.geoAlbers().fitExtent([[224, 20], [990, 630]], mainlandCollection)
            .clipExtent([[224, 20], [990, 630]]);
        const alaskaCollection = { type: "FeatureCollection", features: alaska ? [alaska] : [] };
        const alaskaProjection = d3.geoAlbers().rotate([154, 0]).center([0, 64]).parallels([55, 65])
            .fitExtent([[22, 28], [202, 166]], alaskaCollection)
            .clipExtent([[10, 16], [215, 176]]);
        const mainlandPath = d3.geoPath(mainlandProjection);
        const alaskaPath = d3.geoPath(alaskaProjection);
        const featureById = new Map(mapFeatures
            .filter((feature) => feature.properties.waterwayId)
            .map((feature) => [feature.properties.waterwayId, feature]));
        renderWaterwayLayer(
            elements.offshoreLayer,
            game.waterways.filter((waterway) => waterway.region === "offshore"),
            mainlandProjection,
            alaskaProjection,
            featureById,
        );
        const countries = mapFeatures.filter((feature) => feature.properties.country);
        const countryPath = (feature) => d3.geoPath(mainlandProjection)(orientGeometry(feature.geometry));
        elements.countryLayer.selectAll("path").data(countries, (feature) => feature.properties.country).join("path")
            .attr("class", "country-shape")
            .attr("data-country", (feature) => feature.properties.country)
            .attr("d", countryPath);
        elements.landLayer.selectAll("path").data(mainland).join("path")
            .attr("class", "state-shape")
            .attr("d", mainlandPath);
        elements.countryBoundariesLayer.selectAll("path").data(countries, (feature) => feature.properties.country).join("path")
            .attr("class", "country-boundary")
            .attr("data-country", (feature) => feature.properties.country)
            .attr("d", countryPath);
        elements.alaskaLayer.append("rect")
            .attr("class", "alaska-inset-frame")
            .attr("x", 10).attr("y", 16).attr("width", 205).attr("height", 160);
        elements.alaskaLayer.selectAll("path").data(alaska ? [alaska] : []).join("path")
            .attr("class", "state-shape alaska-shape")
            .attr("d", alaskaPath);
        elements.alaskaLayer.append("text").attr("class", "alaska-inset-label").attr("x", 22).attr("y", 31).text("ALASKA");

        renderWaterwayLayer(
            elements.waterwayLayer,
            game.waterways.filter((waterway) => waterway.region !== "offshore"),
            mainlandProjection,
            alaskaProjection,
            featureById,
        );
        game.shapes = d3.selectAll(".waterway-target");
        updateSelections();
    }

    function renderWaterwayLayer(layer, waterways, mainlandProjection, alaskaProjection, featureById) {
        const shapes = layer.selectAll("g")
            .data(waterways, (waterway) => waterway.id)
            .join("g")
            .attr("class", (waterway) => `waterway-target kind-${waterway.kind}`)
            .attr("data-waterway-id", (waterway) => waterway.id)
            .attr("role", "button")
            .attr("tabindex", 0)
            .attr("aria-label", "Waterway feature")
            .on("pointerenter", (_, waterway) => {
                game.hoveredId = waterway.id;
                updateSelections();
            })
            .on("pointerleave", () => {
                game.hoveredId = null;
                updateSelections();
            })
            .on("click", (_, waterway) => handleMapSelection(waterway.id))
            .on("keydown", (event, waterway) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleMapSelection(waterway.id);
                }
            });
        shapes.each(function (waterway) {
            const projection = waterway.region === "alaska" ? alaskaProjection : mainlandProjection;
            const sourceFeature = featureById.get(waterway.id);
            const geometry = sourceFeature
                ? orientGeometry(sourceFeature.geometry)
                : waterway.kind === "area"
                    ? orientGeometry({ type: "Polygon", coordinates: waterway.coordinates })
                    : { type: "LineString", coordinates: waterway.coordinates[0] };
            const featurePath = d3.geoPath(projection)(geometry);
            const shape = d3.select(this);
            if (waterway.kind === "area") {
                shape.append("path").attr("class", "waterway-fill").attr("d", featurePath);
                shape.append("path").attr("class", "waterway-hitarea").attr("d", featurePath);
            } else {
                shape.append("path").attr("class", "waterway-line-edge").attr("d", featurePath);
                shape.append("path").attr("class", "waterway-line").attr("d", featurePath);
                shape.append("path").attr("class", "waterway-hitarea").attr("d", featurePath);
            }
        });
    }

    function orientGeometry(geometry) {
        const orientPolygon = (rings) => rings.map((ring, index) => orientRing(ring, index > 0));
        if (geometry.type === "Polygon") {
            return { ...geometry, coordinates: orientPolygon(geometry.coordinates) };
        }
        if (geometry.type === "MultiPolygon") {
            return { ...geometry, coordinates: geometry.coordinates.map(orientPolygon) };
        }
        return geometry;
    }

    function orientRing(ring, isHole = false) {
        const signedArea = ring.reduce((area, point, index) => {
            const next = ring[(index + 1) % ring.length];
            return area + point[0] * next[1] - next[0] * point[1];
        }, 0);
        return (signedArea > 0) === isHole ? ring : [...ring].reverse();
    }

    function renderIndex() {
        game.indexButtons = d3.select(elements.index).selectAll("button")
            .data(game.waterways, (waterway) => waterway.id)
            .join("button")
            .attr("class", "index-button")
            .attr("type", "button")
            .attr("aria-label", (waterway) => `Select location ${waterway.number}`)
            .on("click", (_, waterway) => selectWaterway(waterway.id));
        game.indexButtons.append("span").attr("class", "index-number")
            .text((waterway) => String(waterway.number).padStart(2, "0"));
        game.indexButtons.append("span").attr("class", "index-state").attr("aria-hidden", "true");
    }

    function setMode(mode) {
        window.clearTimeout(game.transitionTimer);
        game.transitionTimer = null;
        game.mode = mode;
        game.selectedId = null;
        game.activeId = null;
        game.activeAttempts = 0;
        game.waterways.forEach((waterway) => {
            waterway.attempts = 0;
            waterway.status = "open";
        });
        updateProgress();
        elements.modeIdentify.classList.toggle("is-active", mode === "identify");
        elements.modeLocate.classList.toggle("is-active", mode === "locate");
        elements.modeIdentify.setAttribute("aria-pressed", String(mode === "identify"));
        elements.modeLocate.setAttribute("aria-pressed", String(mode === "locate"));
        elements.indexPanel.hidden = mode === "locate";
        elements.input.disabled = mode === "locate";
        elements.submit.disabled = mode === "locate";
        elements.input.value = "";
        elements.feedback.classList.remove("is-wrong");

        if (mode === "identify") {
            elements.panelOverline.textContent = "IDENTIFY THE SHAPE";
            elements.title.textContent = "Choose a waterway on the map.";
            elements.hint.textContent = "Hover over a river or lake to highlight it, then select it to answer.";
            elements.selectionStatus.textContent = "SELECT A WATERWAY";
            elements.feedback.textContent = "Select a waterway shape to begin.";
            elements.input.placeholder = "Type your answer";
            updateSelections();
            return;
        }

        elements.panelOverline.textContent = "FIND THE NAMED WATERWAY";
        elements.input.placeholder = "Select it on the map";
        game.questionOrder = d3.shuffle(game.waterways.filter((waterway) => waterway.status === "open"));
        game.questionIndex = 0;
        showLocateQuestion();
        updateSelections();
    }

    function showLocateQuestion() {
        const waterway = game.questionOrder[game.questionIndex];
        game.activeId = waterway ? waterway.id : null;
        game.activeAttempts = 0;
        if (!waterway) {
            elements.title.textContent = "Round complete.";
            elements.hint.textContent = "All waterways have been answered.";
            elements.selectionStatus.textContent = "COMPLETE";
            elements.feedback.textContent = "Switch modes or review the completed waterways.";
            updateAttempts({ attempts: 3 });
            return;
        }
        elements.title.textContent = waterway.name;
        elements.hint.textContent = "Click its shape on the map. You have three chances.";
        elements.selectionStatus.textContent = `QUESTION ${game.questionIndex + 1} OF ${game.questionOrder.length}`;
        elements.feedback.textContent = "Select the matching river, lake, or water body.";
        updateAttempts({ attempts: 0 });
        updateSelections();
    }

    function handleMapSelection(id) {
        if (game.mode === "locate") {
            checkLocateSelection(id);
        } else {
            selectWaterway(id);
        }
    }

    function checkLocateSelection(id) {
        const target = findWaterway(game.activeId);
        const choice = findWaterway(id);
        if (!target || !choice) return;
        game.activeAttempts += 1;
        target.attempts += 1;
        if (target.id === choice.id) {
            target.status = "correct";
            game.selectedId = choice.id;
            elements.feedback.textContent = "Correct. Nicely located.";
            elements.feedback.classList.remove("is-wrong");
            advanceLocateQuestion();
        } else if (game.activeAttempts >= 3) {
            target.status = "missed";
            game.selectedId = target.id;
            elements.feedback.textContent = `No chances left. The answer was ${target.name}.`;
            elements.feedback.classList.add("is-wrong");
            advanceLocateQuestion();
        } else {
            game.selectedId = choice.id;
            const left = 3 - game.activeAttempts;
            elements.feedback.textContent = `Not that one. ${left} ${left === 1 ? "chance" : "chances"} left.`;
            elements.feedback.classList.add("is-wrong");
            updateAttempts({ attempts: game.activeAttempts });
        }
        updateSelections();
        updateProgress();
    }

    function advanceLocateQuestion() {
        window.clearTimeout(game.transitionTimer);
        game.transitionTimer = window.setTimeout(() => {
            game.questionIndex += 1;
            showLocateQuestion();
            game.transitionTimer = null;
        }, 700);
    }

    function selectWaterway(id) {
        const waterway = findWaterway(id);
        if (!waterway || waterway.status !== "open") {
            if (waterway) showResult(waterway);
            return;
        }
        game.activeId = null;
        game.selectedId = id;
        elements.title.textContent = `Location ${String(waterway.number).padStart(2, "0")}`;
        elements.hint.textContent = `${3 - waterway.attempts} ${3 - waterway.attempts === 1 ? "chance" : "chances"} remaining.`;
        elements.selectionStatus.textContent = "READY TO ANSWER";
        elements.input.disabled = false;
        elements.submit.disabled = false;
        elements.input.value = "";
        elements.input.placeholder = "Type your answer";
        elements.feedback.textContent = "Type the waterway's name.";
        elements.feedback.classList.remove("is-wrong");
        updateAttempts(waterway);
        updateSelections();
        elements.input.focus({ preventScroll: true });
    }

    function submitAnswer(event) {
        event.preventDefault();
        const waterway = findWaterway(game.selectedId);
        if (!waterway || waterway.status !== "open") return;
        const answer = elements.input.value.trim();
        if (!answer) {
            elements.feedback.textContent = "Type an answer before checking.";
            elements.feedback.classList.add("is-wrong");
            elements.input.focus();
            return;
        }

        waterway.attempts += 1;
        if (answer.toLocaleLowerCase() === waterway.name.toLocaleLowerCase()) {
            waterway.status = "correct";
            elements.feedback.textContent = "Correct. Nicely identified.";
            elements.feedback.classList.remove("is-wrong");
            elements.selectionStatus.textContent = "CORRECT";
        } else if (waterway.attempts >= 3) {
            waterway.status = "missed";
            elements.feedback.textContent = `No chances left. Answer: ${waterway.name}`;
            elements.feedback.classList.add("is-wrong");
            elements.selectionStatus.textContent = "ANSWER REVEALED";
        } else {
            const left = 3 - waterway.attempts;
            elements.feedback.textContent = `Not quite. ${left} ${left === 1 ? "chance" : "chances"} left.`;
            elements.feedback.classList.add("is-wrong");
            elements.input.value = "";
            elements.hint.textContent = `${left} ${left === 1 ? "chance" : "chances"} remaining.`;
        }
        updateAttempts(waterway);
        updateSelections();
        if (waterway.status !== "open") {
            elements.input.disabled = true;
            elements.submit.disabled = true;
            elements.hint.textContent = waterway.name;
            updateProgress();
            if (game.waterways.every((item) => item.status !== "open")) {
                elements.feedback.textContent = "Round complete. Select a finished location to review its answer.";
            }
        }
    }

    function updateAttempts(waterway) {
        elements.attemptDots.forEach((dot, index) => dot.classList.toggle("spent", index >= 3 - waterway.attempts));
    }

    function updateSelections() {
        if (game.indexButtons) game.indexButtons
            .classed("is-selected", (waterway) => waterway.id === game.selectedId && waterway.status === "open")
            .classed("is-correct", (waterway) => waterway.status === "correct")
            .classed("is-missed", (waterway) => waterway.status === "missed")
            .attr("aria-pressed", (waterway) => String(waterway.id === game.selectedId));
        if (game.shapes) {
            game.shapes
                .classed("is-selected", (waterway) => waterway.id === game.selectedId && waterway.status === "open")
                .classed("is-correct", (waterway) => waterway.status === "correct")
                .classed("is-missed", (waterway) => waterway.status === "missed")
                .classed("is-hovered", (waterway) => waterway.id === game.hoveredId)
                .attr("aria-label", (waterway) => game.mode === "locate"
                    ? "Waterway shape"
                    : waterway.status === "correct" || waterway.status === "missed"
                        ? waterway.name
                        : "Unidentified waterway shape");
        }
        if (game.indexButtons) game.indexButtons.select(".index-state")
            .text((waterway) => waterway.status === "correct" ? "✓" : waterway.status === "missed" ? "×" : "");
    }

    function updateProgress() {
        const completed = game.waterways.filter((waterway) => waterway.status === "correct" || waterway.status === "missed");
        const correct = game.waterways.filter((waterway) => waterway.status === "correct").length;
        const missed = game.waterways.filter((waterway) => waterway.status === "missed").length;
        elements.progress.textContent = String(completed.length);
        elements.progressFill.style.width = `${completed.length / game.waterways.length * 100}%`;
        elements.progressTrack.setAttribute("aria-valuenow", String(completed.length));
        elements.correctCount.textContent = String(correct);
        elements.missedCount.textContent = String(missed);
    }

    function showResult(waterway) {
        game.selectedId = waterway.id;
        elements.title.textContent = `Location ${String(waterway.number).padStart(2, "0")}`;
        elements.hint.textContent = waterway.name;
        elements.input.value = "";
        elements.input.disabled = true;
        elements.submit.disabled = true;
        elements.selectionStatus.textContent = waterway.status === "correct" ? "CORRECT" : "ANSWER REVEALED";
        elements.feedback.textContent = waterway.status === "correct" ? "Correctly identified." : "The answer was revealed after three attempts.";
        elements.feedback.classList.toggle("is-wrong", waterway.status === "missed");
        updateAttempts(waterway);
        updateSelections();
    }

    function findWaterway(id) {
        return game.waterways.find((waterway) => waterway.id === id);
    }
});