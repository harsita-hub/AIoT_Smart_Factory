const API_BASE = "http://127.0.0.1:8000";

let historyData = [];
let machineRows = {};
let alertHistory = [];

let lastReadingId = null;

let historySummaryCache = {};

let lastChartUpdate = 0;

const CHART_UPDATE_INTERVAL = 10000;


/* ================= API ================= */

async function getAllReadings() {

    const response = await fetch(
        `${API_BASE}/api/v1/sensor-readings`
    );

    if (!response.ok) {
        throw new Error("Failed to fetch all readings");
    }

    return await response.json();
}


async function getLatestReading() {

    const response = await fetch(
        `${API_BASE}/api/v1/sensor-readings/latest`
    );

    if (!response.ok) {
        throw new Error("Failed to fetch latest reading");
    }

    return await response.json();
}


async function getHistorySummary(machineId, date) {

    const url =
        `${API_BASE}/api/v1/sensor-readings/history-summary` +
        `?machine_id=${encodeURIComponent(machineId)}` +
        `&date=${encodeURIComponent(date)}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Failed to fetch history summary");
    }

    return await response.json();
}


/* ================= GROQ API ================= */

async function askGroq(question) {

    const url =
        `${API_BASE}/api/v1/ai/ask` +
        `?question=${encodeURIComponent(question)}`;


    const response =
        await fetch(url);


    if (!response.ok) {

        let errorMessage =
            "Failed to get AI response.";

        try {

            const errorData =
                await response.json();

            if (errorData.detail) {
                errorMessage =
                    errorData.detail;
            }

        } catch {
            // Keep default error message.
        }

        throw new Error(
            errorMessage
        );
    }


    return await response.json();
}


/* ================= HELPERS ================= */

function formatTime(timestamp) {

    if (!timestamp) {
        return "--";
    }


    const date =
        new Date(timestamp);


    if (Number.isNaN(date.getTime())) {
        return "--";
    }


    return date.toLocaleTimeString();
}


function getDatePart(timestamp) {

    if (!timestamp) {
        return "";
    }


    return String(
        timestamp
    ).split("T")[0];
}


function isAnomaly(reading) {

    return Number(
        reading.is_anomaly
    ) === 1;
}


function safeNumber(
    value,
    decimals = 2
) {

    const number =
        Number(value);


    if (!Number.isFinite(number)) {
        return "--";
    }


    return number.toFixed(
        decimals
    );
}


/* ================= SUMMARY ================= */

function getLatestMachineReadings() {

    const latestByMachine = {};


    for (
        const reading
        of historyData
    ) {

        const machineId =
            reading.machine_id;


        if (
            !latestByMachine[machineId] ||
            Number(reading.id) >
            Number(
                latestByMachine[
                    machineId
                ].id
            )
        ) {

            latestByMachine[
                machineId
            ] = reading;
        }
    }


    return Object.values(
        latestByMachine
    );
}


function updateSummary() {

    const machines =
        getLatestMachineReadings();


    const normalCount =
        machines.filter(
            reading =>
                !isAnomaly(reading)
        ).length;


    const anomalyCount =
        machines.filter(
            reading =>
                isAnomaly(reading)
        ).length;


    document.getElementById(
        "totalMachines"
    ).textContent =
        machines.length;


    document.getElementById(
        "normalCount"
    ).textContent =
        `${normalCount} Normal`;


    document.getElementById(
        "warningCount"
    ).textContent =
        `${anomalyCount} Warning`;


    document.getElementById(
        "criticalCount"
    ).textContent =
        "0 Critical";


    if (!machines.length) {
        return;
    }


    const temperatures =
        machines
            .map(
                reading =>
                    Number(
                        reading.temperature
                    )
            )
            .filter(
                Number.isFinite
            );


    const vibrations =
        machines
            .map(
                reading =>
                    Number(
                        reading.vibration
                    )
            )
            .filter(
                Number.isFinite
            );


    const currents =
        machines
            .map(
                reading =>
                    Number(
                        reading.current
                    )
            )
            .filter(
                Number.isFinite
            );


    if (temperatures.length) {

        const average =
            temperatures.reduce(
                (a, b) => a + b,
                0
            ) /
            temperatures.length;


        document.getElementById(
            "avgTemperature"
        ).textContent =
            `${average.toFixed(1)} °C`;
    }


    if (vibrations.length) {

        const average =
            vibrations.reduce(
                (a, b) => a + b,
                0
            ) /
            vibrations.length;


        document.getElementById(
            "avgVibration"
        ).textContent =
            average.toFixed(2);
    }


    if (currents.length) {

        const average =
            currents.reduce(
                (a, b) => a + b,
                0
            ) /
            currents.length;


        document.getElementById(
            "avgCurrent"
        ).textContent =
            `${average.toFixed(1)} A`;
    }
}


/* ================= MACHINE TABLE ================= */

function createMachineRow(
    reading
) {

    const tbody =
        document.getElementById(
            "machineTableBody"
        );


    const emptyRow =
        tbody.querySelector(
            ".empty"
        );


    if (emptyRow) {
        tbody.innerHTML = "";
    }


    const row =
        document.createElement(
            "tr"
        );


    row.dataset.machine =
        String(
            reading.machine_id
        ).toLowerCase();


    row.innerHTML = `
        <td>
            <span class="machine-id"></span>
        </td>

        <td class="machine-status">
            <span class="status-dot"></span>
            <span class="status-text"></span>
        </td>

        <td class="machine-temperature"></td>

        <td class="machine-vibration"></td>

        <td class="machine-current"></td>

        <td class="machine-time"></td>
    `;


    tbody.appendChild(row);


    machineRows[
        reading.machine_id
    ] = row;


    updateMachineRow(
        reading
    );
}


function updateMachineRow(
    reading
) {

    let row =
        machineRows[
            reading.machine_id
        ];


    if (!row) {

        createMachineRow(
            reading
        );

        row =
            machineRows[
                reading.machine_id
            ];
    }


    row.querySelector(
        ".machine-id"
    ).textContent =
        reading.machine_id;


    const statusCell =
        row.querySelector(
            ".machine-status"
        );


    const statusText =
        row.querySelector(
            ".status-text"
        );


    if (isAnomaly(reading)) {

        statusCell.className =
            "machine-status status-critical";

        statusText.textContent =
            "ANOMALY";

    } else {

        statusCell.className =
            "machine-status status-normal";

        statusText.textContent =
            "NORMAL";
    }


    row.querySelector(
        ".machine-temperature"
    ).textContent =
        `${safeNumber(
            reading.temperature
        )} °C`;


    row.querySelector(
        ".machine-vibration"
    ).textContent =
        safeNumber(
            reading.vibration
        );


    row.querySelector(
        ".machine-current"
    ).textContent =
        `${safeNumber(
            reading.current
        )} A`;


    row.querySelector(
        ".machine-time"
    ).textContent =
        formatTime(
            reading.timestamp
        );
}


function loadMachineTable() {

    const tbody =
        document.getElementById(
            "machineTableBody"
        );


    tbody.innerHTML = "";

    machineRows = {};


    const machines =
        getLatestMachineReadings();


    if (!machines.length) {

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="empty"
                >
                    No machine data available
                </td>
            </tr>
        `;

        return;
    }


    machines.forEach(
        reading =>
            createMachineRow(
                reading
            )
    );
}


/* ================= HISTORY MACHINE LIST ================= */

function populateHistoryMachines() {

    const select =
        document.getElementById(
            "historyMachine"
        );


    const ids =
        [
            ...new Set(
                historyData.map(
                    reading =>
                        reading.machine_id
                )
            )
        ].sort();


    const oldValue =
        select.value;


    select.innerHTML = `
        <option value="">
            Select machine
        </option>
    `;


    ids.forEach(
        machineId => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                machineId;


            option.textContent =
                machineId;


            select.appendChild(
                option
            );
        }
    );


    if (
        ids.includes(oldValue)
    ) {

        select.value =
            oldValue;

    } else if (
        ids.length === 1
    ) {

        select.value =
            ids[0];
    }
}


/* ================= LIVE SENSOR ================= */

function updateLiveData(
    reading
) {

    if (!reading) {
        return;
    }


    document.getElementById(
        "liveTitle"
    ).textContent =
        `Live Sensor Data (${reading.machine_id})`;


    document.getElementById(
        "liveTemperature"
    ).textContent =
        `${safeNumber(
            reading.temperature
        )} °C`;


    document.getElementById(
        "liveVibration"
    ).textContent =
        safeNumber(
            reading.vibration
        );


    document.getElementById(
        "liveCurrent"
    ).textContent =
        `${safeNumber(
            reading.current
        )} A`;


    const time =
        formatTime(
            reading.timestamp
        );


    document.getElementById(
        "liveTimestamp"
    ).textContent =
        time;


    document.getElementById(
        "sidebarLastUpdated"
    ).textContent =
        time;


    const anomaly =
        isAnomaly(
            reading
        );


    const desiredText =
        anomaly
            ? "Anomaly"
            : "Normal";


    const desiredClass =
        anomaly
            ? "status-pill anomaly"
            : "status-pill normal";


    [
        document.getElementById(
            "temperatureStatus"
        ),
        document.getElementById(
            "vibrationStatus"
        ),
        document.getElementById(
            "currentStatus"
        )
    ].forEach(
        element => {

            if (
                element.textContent !==
                desiredText
            ) {

                element.textContent =
                    desiredText;
            }


            if (
                element.className !==
                desiredClass
            ) {

                element.className =
                    desiredClass;
            }

        }
    );
}


/* ================= ALERTS ================= */

function updateAlertBadges() {

    const count =
        alertHistory.length;


    document.getElementById(
        "alertBadge"
    ).textContent =
        count;


    document.getElementById(
        "topAlertBadge"
    ).textContent =
        count;
}


function createAlertElement(
    alert
) {

    const element =
        document.createElement(
            "div"
        );


    element.className =
        "alert-item";


    element.innerHTML = `
        <div class="alert-top">

            <div>

                <div class="alert-title">
                    ${alert.machine_id}
                    - Possible Anomaly
                </div>

                <div class="alert-details">

                    T:
                    ${safeNumber(
                        alert.temperature
                    )}
                    °C

                    &nbsp;|&nbsp;

                    V:
                    ${safeNumber(
                        alert.vibration
                    )}

                    &nbsp;|&nbsp;

                    I:
                    ${safeNumber(
                        alert.current
                    )}
                    A

                </div>

            </div>


            <span class="alert-pill">
                Alert
            </span>

        </div>


        <div class="alert-time">
            ${formatTime(
                alert.timestamp
            )}
        </div>
    `;


    return element;
}


function addAlert(
    reading
) {

    if (
        !reading ||
        !isAnomaly(reading)
    ) {
        return;
    }


    const exists =
        alertHistory.some(
            alert =>
                Number(alert.id) ===
                Number(reading.id)
        );


    if (exists) {
        return;
    }


    alertHistory.unshift(
        reading
    );


    alertHistory =
        alertHistory.slice(
            0,
            8
        );


    const container =
        document.getElementById(
            "alertsList"
        );


    const empty =
        container.querySelector(
            ".empty-alert"
        );


    if (empty) {
        empty.remove();
    }


    container.prepend(
        createAlertElement(
            reading
        )
    );


    while (
        container.children.length >
        8
    ) {

        container.removeChild(
            container.lastElementChild
        );
    }


    updateAlertBadges();
}


function seedAlertHistory() {

    alertHistory = [];


    const container =
        document.getElementById(
            "alertsList"
        );


    container.innerHTML = "";


    const anomalies =
        historyData
            .filter(
                isAnomaly
            )
            .slice(
                -8
            )
            .reverse();


    anomalies.forEach(
        reading =>
            addAlert(
                reading
            )
    );


    if (!anomalies.length) {

        container.innerHTML = `
            <div class="empty-alert">
                No anomalies detected yet
            </div>
        `;

        updateAlertBadges();
    }
}


/* ================= AI INSIGHTS ================= */

function setupAIInsights() {

    const container =
        document.getElementById(
            "aiInsights"
        );


    container.innerHTML = `

        <div
            class="insight-item"
            data-insight="main"
        >

            <div
                class="insight-symbol"
                data-symbol
            >
                🤖
            </div>

            <div>

                <strong data-title>
                    System Monitoring
                </strong>

                <p data-text>
                    AIoT monitoring system is
                    collecting machine sensor data.
                </p>

            </div>

        </div>


        <div
            class="insight-item"
            data-insight="secondary"
        >

            <div class="insight-symbol">
                📊
            </div>

            <div>

                <strong>
                    Live Monitoring
                </strong>

                <p data-text>
                    Sensor data is being received
                    continuously.
                </p>

            </div>

        </div>
    `;
}


function updateAIInsights(
    reading
) {

    if (!reading) {
        return;
    }


    const container =
        document.getElementById(
            "aiInsights"
        );


    const main =
        container.querySelector(
            '[data-insight="main"]'
        );


    const secondary =
        container.querySelector(
            '[data-insight="secondary"]'
        );


    const symbol =
        main.querySelector(
            "[data-symbol]"
        );


    const title =
        main.querySelector(
            "[data-title]"
        );


    const mainText =
        main.querySelector(
            "[data-text]"
        );


    const secondaryText =
        secondary.querySelector(
            "[data-text]"
        );


    if (
        isAnomaly(reading)
    ) {

        symbol.textContent =
            "⚠️";


        title.textContent =
            "Possible abnormal behaviour detected";


        mainText.textContent =
            `Machine ${reading.machine_id} has been classified as an anomaly by the ML model.`;


        secondaryText.textContent =
            `Temperature ${safeNumber(reading.temperature)} °C, vibration ${safeNumber(reading.vibration)}, current ${safeNumber(reading.current)} A.`;

    } else {

        symbol.textContent =
            "✅";


        title.textContent =
            "Current machine status is normal";


        mainText.textContent =
            `Machine ${reading.machine_id} is currently being monitored using live sensor data.`;


        secondaryText.textContent =
            "The latest sensor reading was not classified as an anomaly.";
    }
}


/* ================= CHARTS ================= */

function setupChart(
    svgId
) {

    const svg =
        document.getElementById(
            svgId
        );


    if (
        !svg ||
        svg.dataset.ready
    ) {
        return;
    }


    svg.dataset.ready =
        "true";


    const left = 45;
    const right = 585;
    const top = 18;
    const bottom = 190;


    let grid = "";


    for (
        let i = 0;
        i <= 4;
        i++
    ) {

        const y =
            top +
            ((bottom - top) / 4) *
            i;


        grid += `

            <line
                class="chart-grid-line"
                x1="${left}"
                y1="${y}"
                x2="${right}"
                y2="${y}"
            ></line>

            <text
                class="chart-label chart-y-label-${i}"
                x="${left - 7}"
                y="${y + 3}"
                text-anchor="end"
            >
                --
            </text>
        `;
    }


    svg.innerHTML = `

        ${grid}

        <polyline
            class="chart-line"
            points=""
        ></polyline>

        <text
            class="chart-axis-label"
            x="${left}"
            y="210"
            text-anchor="middle"
        >
            Old
        </text>

        <text
            class="chart-axis-label"
            x="${right}"
            y="210"
            text-anchor="middle"
        >
            Now
        </text>
    `;
}


function updateChart(
    svgId,
    key,
    suffix
) {

    const svg =
        document.getElementById(
            svgId
        );


    if (!svg) {
        return;
    }


    setupChart(
        svgId
    );


    const readings =
        historyData.slice(
            -40
        );


    if (
        readings.length < 2
    ) {
        return;
    }


    const values =
        readings
            .map(
                reading =>
                    Number(
                        reading[key]
                    )
            )
            .filter(
                Number.isFinite
            );


    if (
        values.length < 2
    ) {
        return;
    }


    let min =
        Math.min(
            ...values
        );


    let max =
        Math.max(
            ...values
        );


    if (
        min === max
    ) {

        min -= 1;
        max += 1;
    }


    const padding =
        (max - min) *
        0.15;


    min -= padding;
    max += padding;


    const left = 45;
    const right = 585;
    const top = 18;
    const bottom = 190;


    const chartWidth =
        right - left;


    const chartHeight =
        bottom - top;


    const points =
        readings.map(
            (
                reading,
                index
            ) => {

                const value =
                    Number(
                        reading[key]
                    );


                const x =
                    left +
                    (
                        index /
                        (
                            readings.length - 1
                        )
                    ) *
                    chartWidth;


                const y =
                    bottom -
                    (
                        (value - min) /
                        (max - min)
                    ) *
                    chartHeight;


                return `${x.toFixed(2)},${y.toFixed(2)}`;
            }
        ).join(" ");


    const line =
        svg.querySelector(
            ".chart-line"
        );


    line.setAttribute(
        "points",
        points
    );


    for (
        let i = 0;
        i <= 4;
        i++
    ) {

        const value =
            max -
            (
                (max - min) / 4
            ) *
            i;


        const label =
            svg.querySelector(
                `.chart-y-label-${i}`
            );


        if (label) {

            label.textContent =
                `${value.toFixed(1)}${suffix}`;
        }
    }
}


function setupCharts() {

    setupChart(
        "temperatureChart"
    );

    setupChart(
        "vibrationChart"
    );

    setupChart(
        "currentChart"
    );
}


function updateCharts() {

    updateChart(
        "temperatureChart",
        "temperature",
        "°C"
    );


    updateChart(
        "vibrationChart",
        "vibration",
        ""
    );


    updateChart(
        "currentChart",
        "current",
        "A"
    );


    lastChartUpdate =
        Date.now();
}


function maybeUpdateCharts() {

    const now =
        Date.now();


    if (
        now -
        lastChartUpdate >=
        CHART_UPDATE_INTERVAL
    ) {

        updateCharts();
    }
}


/* ================= MACHINE SEARCH ================= */

function setupSearch() {

    const input =
        document.getElementById(
            "machineSearch"
        );


    input.addEventListener(
        "input",
        () => {

            const query =
                input.value
                    .trim()
                    .toLowerCase();


            Object.entries(
                machineRows
            ).forEach(
                (
                    [
                        machineId,
                        row
                    ]
                ) => {

                    const match =
                        machineId
                            .toLowerCase()
                            .includes(
                                query
                            );


                    row.classList.toggle(
                        "hidden-row",
                        Boolean(
                            query
                        ) &&
                        !match
                    );
                }
            );
        }
    );
}


/* ================= HISTORY ================= */

function setHistoryStatus(
    text,
    type
) {

    const status =
        document.getElementById(
            "historyStatus"
        );


    status.textContent =
        text;


    status.className =
        `history-status ${type}`;
}


function clearHistoryDisplay() {

    document.getElementById(
        "historyTotalReadings"
    ).textContent =
        "--";


    document.getElementById(
        "historyAnomalyCount"
    ).textContent =
        "--";


    document.getElementById(
        "historyMachineValue"
    ).textContent =
        "--";


    document.getElementById(
        "historyDateValue"
    ).textContent =
        "--";


    document.getElementById(
        "historyMessage"
    ).textContent =
        "";


    document.getElementById(
        "historyAnomalies"
    ).innerHTML =
        "";


    setHistoryStatus(
        "Select a machine and date to check history.",
        "neutral"
    );
}


function renderHistoryAnomalies(
    anomalies,
    totalAnomalies
) {

    const container =
        document.getElementById(
            "historyAnomalies"
        );


    container.innerHTML =
        "";


    if (
        !anomalies.length
    ) {

        container.innerHTML = `
            <div class="history-no-anomaly">
                No anomaly found for the selected time.
            </div>
        `;

        return;
    }


    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        "history-anomaly-list";


    wrapper.innerHTML = `

        <div
            class="history-anomaly-row header"
        >

            <span>
                Time
            </span>

            <span>
                Temperature
            </span>

            <span>
                Vibration
            </span>

            <span>
                Current
            </span>

            <span>
                Status
            </span>

        </div>
    `;


    anomalies.forEach(
        anomaly => {

            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "history-anomaly-row";


            row.innerHTML = `

                <span>
                    ${anomaly.time || "--"}
                </span>

                <span>
                    ${safeNumber(
                        anomaly.temperature
                    )} °C
                </span>

                <span>
                    ${safeNumber(
                        anomaly.vibration
                    )}
                </span>

                <span>
                    ${safeNumber(
                        anomaly.current
                    )} A
                </span>

                <span>
                    ANOMALY
                </span>
            `;


            wrapper.appendChild(
                row
            );
        }
    );


    container.appendChild(
        wrapper
    );


    if (
        anomalies.length <
        totalAnomalies
    ) {

        const note =
            document.createElement(
                "div"
            );


        note.className =
            "history-message";


        note.style.marginTop =
            "8px";


        note.textContent =
            `Showing ${anomalies.length} matching anomalies. Total anomalies for this date: ${totalAnomalies}.`;


        container.appendChild(
            note
        );
    }
}


async function checkHistory() {

    const machine =
        document.getElementById(
            "historyMachine"
        ).value;


    const date =
        document.getElementById(
            "historyDate"
        ).value;


    const time =
        document.getElementById(
            "historyTime"
        ).value;


    if (
        !machine ||
        !date
    ) {

        setHistoryStatus(
            "Please select a machine and date.",
            "nodata"
        );

        return;
    }


    const button =
        document.getElementById(
            "checkHistoryBtn"
        );


    button.disabled =
        true;


    button.textContent =
        "Checking...";


    try {

        const cacheKey =
            `${machine}|${date}`;


        let summary =
            historySummaryCache[
                cacheKey
            ];


        if (!summary) {

            summary =
                await getHistorySummary(
                    machine,
                    date
                );


            historySummaryCache[
                cacheKey
            ] =
                summary;
        }


        const anomalies =
            Array.isArray(
                summary.anomalies
            )
                ? summary.anomalies
                : [];


        const totalReadings =
            Number(
                summary.total_readings
            ) || 0;


        const totalAnomalies =
            Number(
                summary.anomaly_count
            ) || 0;


        let matching =
            anomalies;


        if (time) {

            const minute =
                time.slice(0, 5);


            matching =
                anomalies.filter(
                    anomaly =>
                        String(
                            anomaly.time || ""
                        ).slice(0, 5) ===
                        minute
                );
        }


        document.getElementById(
            "historyTotalReadings"
        ).textContent =
            totalReadings;


        document.getElementById(
            "historyAnomalyCount"
        ).textContent =
            totalAnomalies;


        document.getElementById(
            "historyMachineValue"
        ).textContent =
            machine;


        document.getElementById(
            "historyDateValue"
        ).textContent =
            date;


        if (!totalReadings) {

            setHistoryStatus(
                "No sensor data found for this date.",
                "nodata"
            );


            document.getElementById(
                "historyMessage"
            ).textContent =
                "No stored readings were found for the selected machine and date.";


            renderHistoryAnomalies(
                [],
                0
            );


            return;
        }


        if (time) {

            if (
                matching.length > 0
            ) {

                setHistoryStatus(
                    `ANOMALY DETECTED at ${time}`,
                    "anomaly"
                );


                document.getElementById(
                    "historyMessage"
                ).textContent =
                    `Anomaly record found during ${time}. Exact recorded times and sensor values are shown below.`;

            } else {

                setHistoryStatus(
                    `NORMAL — No anomaly detected at ${time}`,
                    "normal"
                );


                document.getElementById(
                    "historyMessage"
                ).textContent =
                    `No anomaly record was found during ${time}.`;
            }

        } else {

            if (
                totalAnomalies > 0
            ) {

                setHistoryStatus(
                    `ANOMALY DETECTED — ${totalAnomalies} anomalies found`,
                    "anomaly"
                );


                document.getElementById(
                    "historyMessage"
                ).textContent =
                    `${totalAnomalies} anomaly records were detected on ${date}.`;

            } else {

                setHistoryStatus(
                    "NORMAL — No anomaly detected",
                    "normal"
                );


                document.getElementById(
                    "historyMessage"
                ).textContent =
                    `No anomaly was recorded on ${date}.`;
            }
        }


        const display =
            time
                ? matching
                : matching
                    .slice(-10)
                    .reverse();


        renderHistoryAnomalies(
            display,
            time
                ? matching.length
                : totalAnomalies
        );

    } catch (error) {

        console.error(
            "History check error:",
            error
        );


        setHistoryStatus(
            "Unable to load history.",
            "nodata"
        );


        document.getElementById(
            "historyMessage"
        ).textContent =
            "Make sure the FastAPI server is running.";

    } finally {

        button.disabled =
            false;


        button.textContent =
            "Check History";
    }
}


function setupHistorySearch() {

    document.getElementById(
        "checkHistoryBtn"
    ).addEventListener(
        "click",
        checkHistory
    );


    document.getElementById(
        "clearHistoryBtn"
    ).addEventListener(
        "click",
        clearHistoryDisplay
    );
}


/* ================= AI ASSISTANT FRONTEND ================= */

function setAIAnswer(
    type,
    message
) {

    const container =
        document.getElementById(
            "aiAnswer"
        );


    if (
        type === "loading"
    ) {

        container.innerHTML = `
            <div class="ai-answer-loading">
                🤖 AI is thinking...
            </div>
        `;

        return;
    }


    if (
        type === "error"
    ) {

        container.innerHTML = `
            <div class="ai-answer-error">
                ${message}
            </div>
        `;

        return;
    }


    container.innerHTML = `
        <div class="ai-answer-content"></div>
    `;


    container.querySelector(
        ".ai-answer-content"
    ).textContent =
        message;
}


async function handleAskAI() {

    const questionInput =
        document.getElementById(
            "aiQuestion"
        );


    const button =
        document.getElementById(
            "askAiBtn"
        );


    const question =
        questionInput.value.trim();


    if (!question) {

        setAIAnswer(
            "error",
            "Please enter a question first."
        );

        return;
    }


    button.disabled =
        true;


    button.textContent =
        "Thinking...";


    setAIAnswer(
        "loading"
    );


    try {

        const result =
            await askGroq(
                question
            );


        const answer =
            result.answer ||
            "The AI did not return an answer.";


        setAIAnswer(
            "success",
            answer
        );

    } catch (error) {

        console.error(
            "AI request error:",
            error
        );


        setAIAnswer(
            "error",
            `AI request failed: ${error.message}`
        );

    } finally {

        button.disabled =
            false;


        button.textContent =
            "Ask AI";
    }
}


function setupAIAssistant() {

    const button =
        document.getElementById(
            "askAiBtn"
        );


    const input =
        document.getElementById(
            "aiQuestion"
        );


    button.addEventListener(
        "click",
        handleAskAI
    );


    input.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                handleAskAI();
            }
        }
    );
}


/* ================= SCROLL ================= */

function setupScrollActions() {

    document.querySelectorAll(
        "[data-scroll]"
    ).forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const target =
                        document.getElementById(
                            button.dataset.scroll
                        );


                    if (target) {

                        target.scrollIntoView({
                            behavior: "smooth",
                            block: "start"
                        });
                    }
                }
            );
        }
    );
}


/* ================= INITIALIZATION ================= */

async function initializeDashboard() {

    try {

        setupAIInsights();

        setupCharts();


        historyData =
            await getAllReadings();


        updateSummary();

        loadMachineTable();

        populateHistoryMachines();

        seedAlertHistory();


        const latest =
            await getLatestReading();


        if (latest) {

            lastReadingId =
                latest.id;


            updateLiveData(
                latest
            );


            updateAIInsights(
                latest
            );


            addAlert(
                latest
            );


            const latestDate =
                getDatePart(
                    latest.timestamp
                );


            if (latestDate) {

                document.getElementById(
                    "historyDate"
                ).value =
                    latestDate;
            }
        }


        updateCharts();

    } catch (error) {

        console.error(
            "Dashboard initialization error:",
            error
        );
    }
}


/* ================= LIVE UPDATE ================= */

async function updateDashboard() {

    try {

        const latest =
            await getLatestReading();


        if (!latest) {
            return;
        }


        /*
            Only live information updates
            every 2 seconds.
        */

        updateLiveData(
            latest
        );


        updateAIInsights(
            latest
        );


        /*
            Other sections update only
            when a genuinely new record appears.
        */

        if (
            Number(latest.id) !==
            Number(lastReadingId)
        ) {

            lastReadingId =
                latest.id;


            historyData.push(
                latest
            );


            updateMachineRow(
                latest
            );


            addAlert(
                latest
            );


            updateSummary();


            maybeUpdateCharts();
        }

    } catch (error) {

        console.error(
            "Live update error:",
            error
        );
    }
}


/* ================= START ================= */

setupSearch();

setupHistorySearch();

setupAIAssistant();

setupScrollActions();

initializeDashboard();


/* ================= LIVE POLLING ================= */

let liveTimer = null;
let aiTyping = false;


function startLivePolling() {

    if (liveTimer) {
        return;
    }


    liveTimer = setTimeout(
        async function runLiveUpdate() {

            /*
                AI box mein user type kar raha ho
                to live dashboard update nahi hoga.
            */

            if (!aiTyping) {
                await updateDashboard();
            }


            liveTimer = setTimeout(
                runLiveUpdate,
                2000
            );

        },
        2000
    );
}


function stopLivePolling() {

    if (liveTimer) {

        clearTimeout(
            liveTimer
        );

        liveTimer = null;
    }
}


/* ================= AI TYPING PROTECTION ================= */

const aiInput =
    document.getElementById(
        "aiQuestion"
    );


if (aiInput) {

    aiInput.addEventListener(
        "focus",
        () => {

            aiTyping = true;

            stopLivePolling();

        }
    );


    aiInput.addEventListener(
        "input",
        () => {

            /*
                User ka question browser mein
                temporarily save rahega.
            */

            sessionStorage.setItem(
                "factoryAIQuestion",
                aiInput.value
            );

        }
    );


    aiInput.addEventListener(
        "blur",
        () => {

            aiTyping = false;

            startLivePolling();

        }
    );


    const savedQuestion =
        sessionStorage.getItem(
            "factoryAIQuestion"
        );


    if (savedQuestion) {

        aiInput.value =
            savedQuestion;
    }
}


/* ================= START ================= */

startLivePolling();