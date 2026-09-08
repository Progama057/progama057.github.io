const defaultFormats = [
    // --- Siebdruck ---
    { id: 'sps-1', category: 'Siebdruck', machine: 'SPS', name: '1030 × 540 mm', width: 1030, height: 540 },
    { id: 'sps-2', category: 'Siebdruck', machine: 'SPS', name: '930 × 630 mm', width: 930, height: 630 },
    { id: 'sps-3', category: 'Siebdruck', machine: 'SPS', name: '1000 × 700 mm', width: 1000, height: 700 },

    { id: 'thi-1', category: 'Siebdruck', machine: 'Thime 3020', name: '700 × 500 mm', width: 700, height: 500 },
    { id: 'thi-2', category: 'Siebdruck', machine: 'Thime 3020', name: '540 × 515 mm', width: 540, height: 515 },
    { id: 'thi-3', category: 'Siebdruck', machine: 'Thime 3020', name: '540 × 343 mm', width: 540, height: 343 },
    { id: 'thi-4', category: 'Siebdruck', machine: 'Thime 3020', name: '630 × 465 mm', width: 630, height: 465 },
    { id: 'thi-5', category: 'Siebdruck', machine: 'Thime 3020', name: '630 × 310 mm', width: 630, height: 310 },

    // --- Digitaldruck ---
    { id: 'fuji-1', category: 'Digitaldruck', machine: 'Fuji Prime 30', name: '1030 × 540 mm', width: 1030, height: 540 },
    { id: 'fuji-2', category: 'Digitaldruck', machine: 'Fuji Prime 30', name: '930 × 630 mm', width: 930, height: 630 },
    { id: 'fuji-3', category: 'Digitaldruck', machine: 'Fuji Prime 30', name: '1000 × 700 mm', width: 1000, height: 700 },

    { id: 'mim-1', category: 'Digitaldruck', machine: 'Mimaki (Rolle)', name: '1270 mm Rolle', width: 1270, isRoll: true },
    { id: 'mim-2', category: 'Digitaldruck', machine: 'Mimaki (Rolle)', name: '1370 mm Rolle', width: 1370, isRoll: true },
    { id: 'mim-3', category: 'Digitaldruck', machine: 'Mimaki (Rolle)', name: '1570 mm Rolle', width: 1570, isRoll: true }
];

let allFormats = [...defaultFormats];
const ORIENTATIONS = ["h", "v"];
let bestMachineResult = null;
const machineSettingIds = ["machineGripperSPS", "machineSpeedSPS", "machineGripperThime", "machineSpeedThime", "machineGripperFuji", "machineSpeedFuji", "machineGripperMimaki", "machineSpeedMimaki", "machineGap"];
const machineRuleIds = ["spsMinSheets", "thimeMaxSheets", "primeMaxSheets"];
const machineSettingsByName = {
    "SPS": { gripper: "machineGripperSPS", speed: "machineSpeedSPS" },
    "Thime 3020": { gripper: "machineGripperThime", speed: "machineSpeedThime" },
    "Fuji Prime 30": { gripper: "machineGripperFuji", speed: "machineSpeedFuji" },
    "Mimaki (Rolle)": { gripper: "machineGripperMimaki", speed: "machineSpeedMimaki" }
};
const materialCostIds = ["prepressCost", "packagingCost", "materialProfitMargin", "materialVat"];

window.addEventListener("pagehide", () => {
    sessionStorage.removeItem("isAdmin");
});

function formatPercent(value) {
    if (!isFinite(value) || value < 0) return "–";
    return value.toLocaleString("de-DE", { maximumFractionDigits: 1 }) + " %";
}

function loadCustomFormats() {
    const stored = localStorage.getItem("customFormats");
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            allFormats = [...defaultFormats, ...parsed];
        } catch (e) {
            console.error("Fehler beim Laden der eigenen Formate", e);
        }
    }
}

function saveCustomFormats() {
    const customOnly = allFormats.filter(f => f.isCustom);
    localStorage.setItem("customFormats", JSON.stringify(customOnly));
}

function renderTables() {
    const container = document.getElementById("resultsContainer");
    container.innerHTML = "";

    const grouped = {};
    allFormats.forEach(fmt => {
        if (!grouped[fmt.category]) grouped[fmt.category] = {};
        if (!grouped[fmt.category][fmt.machine]) grouped[fmt.category][fmt.machine] = [];
        grouped[fmt.category][fmt.machine].push(fmt);
    });

    for (const [category, machines] of Object.entries(grouped)) {
        const catHeader = document.createElement("h2");
        catHeader.className = "category-header";
        catHeader.textContent = category;
        container.appendChild(catHeader);

        for (const [machineName, formats] of Object.entries(machines)) {
            const card = document.createElement("div");
            card.className = "machine-card"; // Startet standardmäßig aufgeklappt

            const mTitle = document.createElement("h3");
            mTitle.className = "machine-title";
            mTitle.textContent = machineName;
            
            // Klick-Event fürs Ein-/Ausklappen
            mTitle.addEventListener("click", () => {
                card.classList.toggle("collapsed");
            });
            
            card.appendChild(mTitle);

            const contentDiv = document.createElement("div");
            contentDiv.className = "machine-content";

            const table = document.createElement("table");
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Format</th>
                        <th>Ausrichtung</th>
                        <th>Nutzen / Laufmeter</th>
                        <th class="col-layout">Anordnung</th>
                        <th class="col-efficiency">Fläche</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            const tbody = table.querySelector("tbody");

            formats.forEach((fmt, index) => {
                ORIENTATIONS.forEach(ori => {
                    const tr = document.createElement("tr");
                    tr.id = `row-${fmt.id}-${ori}`;
                    if (index % 2 !== 0) tr.classList.add("row-alt-bg");
                    
                    tr.addEventListener("click", (e) => {
                        if(e.target.classList.contains("btn-delete")) return;
                        onRowClick(fmt, ori);
                    });

                    const tdFormat = document.createElement("td");
                    tdFormat.className = "format-col";
                    tdFormat.setAttribute("data-label", "Format");
                    
                    const nameSpan = document.createElement("span");
                    nameSpan.textContent = fmt.name;
                    tdFormat.appendChild(nameSpan);

                    // Löschen-Button für Custom-Formate (nur beim h-Eintrag anzeigen)
                    if (fmt.isCustom && ori === "h") {
                        const delBtn = document.createElement("button");
                        delBtn.className = "btn-delete";
                        delBtn.textContent = "Löschen";
                        delBtn.onclick = (e) => {
                            e.stopPropagation();
                            allFormats = allFormats.filter(f => f.id !== fmt.id);
                            saveCustomFormats();
                            renderTables();
                            recalc();
                        };
                        tdFormat.appendChild(delBtn);
                    }
                    tr.appendChild(tdFormat);

                    const tdOri = document.createElement("td");
                    tdOri.setAttribute("data-label", "Ausrichtung");
                    tdOri.textContent = ori === "h" ? "horizontal (nicht gedreht)" : "vertikal (gedreht)";
                    tr.appendChild(tdOri);

                    const tdPieces = document.createElement("td");
                    tdPieces.id = `pieces-${fmt.id}-${ori}`;
                    tdPieces.setAttribute("data-label", "Nutzen / Laufmeter");
                    tdPieces.className = "muted";
                    tdPieces.textContent = "Bitte Produktmaße eingeben";
                    tr.appendChild(tdPieces);

                    const tdLayout = document.createElement("td");
                    tdLayout.id = `layout-${fmt.id}-${ori}`;
                    tdLayout.className = "col-layout";
                    tdLayout.setAttribute("data-label", "Anordnung");
                    tdLayout.textContent = "–";
                    tr.appendChild(tdLayout);

                    const tdEfficiency = document.createElement("td");
                    tdEfficiency.id = `efficiency-${fmt.id}-${ori}`;
                    tdEfficiency.className = "col-efficiency";
                    tdEfficiency.setAttribute("data-label", "Fläche");
                    tdEfficiency.textContent = "–";
                    tr.appendChild(tdEfficiency);

                    tbody.appendChild(tr);
                });
            });

            contentDiv.appendChild(table);
            card.appendChild(contentDiv);
            container.appendChild(card);
        }
    }
}

function getMachineRule(id, fallback) {
    const value = parseInputValue(id);
    return Number.isFinite(value) ? value : fallback;
}

function renderDashboardComparison() {
    const comparison = document.getElementById("dashboardComparison");
    const productWidth = parseInputValue("dashboardWidth");
    const productHeight = parseInputValue("dashboardHeight");
    const quantity = parseInputValue("dashboardQuantity");
    if (!Number.isFinite(productWidth) || productWidth <= 0 || !Number.isFinite(productHeight) || productHeight <= 0 || !Number.isFinite(quantity) || quantity <= 0) {
        comparison.textContent = "Maße und Auflage eingeben.";
        document.getElementById("dashboardInkResult").textContent = "Format und Auflage eingeben, um den Farbverbrauch zu sehen.";
        return;
    }
    document.getElementById("productWidth").value = productWidth;
    document.getElementById("productHeight").value = productHeight;
    document.getElementById("productionQuantity").value = quantity;
    document.getElementById("inkLength").value = productWidth / 10;
    document.getElementById("inkWidth").value = productHeight / 10;
    document.getElementById("inkQuantity").value = quantity;
    recalc();
    calculateInkConsumption();
    comparison.innerHTML = document.getElementById("machineComparison").innerHTML;
    renderDashboardInkResult(productWidth, productHeight, quantity);
    const bestCard = comparison.querySelector(".best-machine");
    if (bestCard && bestMachineResult) {
        bestCard.title = "Detailansicht öffnen";
        bestCard.setAttribute("role", "button");
        bestCard.setAttribute("tabindex", "0");
        bestCard.addEventListener("click", () => {
            const format = allFormats.find(item => item.id === bestMachineResult.fmtId);
            if (format) onRowClick(format, bestMachineResult.ori);
        });
        bestCard.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                bestCard.click();
            }
        });
    }
}

function renderDashboardInkResult(lengthMm, widthMm, quantity) {
    const result = document.getElementById("dashboardInkResult");
    const densityInput = document.getElementById("inkDensity");
    const surchargeInput = document.getElementById("inkSurcharge");
    const density = densityInput ? (parseFloat(densityInput.value.replace(",", ".")) || 1.2) : 1.2;
    const surcharge = surchargeInput ? (parseFloat(surchargeInput.value.replace(",", ".")) || 15) : 15;
    if (!inkScreens.length || !Number.isFinite(density) || density <= 0 || !Number.isFinite(surcharge) || surcharge < 0) {
        result.textContent = "Sieb und Farbverbrauchseinstellungen im Farbverbrauch hinterlegen.";
        return;
    }
    const area = (lengthMm / 1000) * (widthMm / 1000);
    const volume = inkScreens[0].volume ?? inkScreens[0].consumption ?? defaultInkVolume(inkScreens[0].mesh);
    const total = area * volume * density * quantity * (1 + surcharge / 100);
    result.innerHTML = "";
    const title = document.createElement("small");
    title.textContent = `Alle Farben | Siebgewebe: ${inkScreens[0].mesh} | Farbvolumen: ${formatNumber(volume, 1)} cm³/m²`;
    const value = document.createElement("strong");
    value.textContent = `${formatNumber(total / 1000)} kg (${formatNumber(total)} g)`;
    const details = document.createElement("span");
    details.textContent = `${lengthMm} × ${widthMm} mm | ${quantity} Stück | Zuschuss ${formatNumber(surcharge, 1)} %`;
    result.append(title, value, details);
}

function recalc() {
    const wInput = document.getElementById("productWidth");
    const hInput = document.getElementById("productHeight");
    const qInput = document.getElementById("productionQuantity");
    const errorEl = document.getElementById("error");

    const wValue = wInput.value.replace(",", ".");
    const hValue = hInput.value.replace(",", ".");
    const qValueRaw = qInput.value.replace(",", "."); 

    const productWidth = parseFloat(wValue);
    const productHeight = parseFloat(hValue);
    const productionQuantity = parseInt(qValueRaw, 10);

    if (!wValue && !hValue) {
        errorEl.textContent = "";
        bestMachineResult = null;
        document.getElementById("machineComparison").textContent = "Produktmaße eingeben, um Maschinen zu vergleichen.";
        renderTables();
        return;
    }

    if (isNaN(productWidth) || productWidth <= 0 || isNaN(productHeight) || productHeight <= 0) {
        errorEl.textContent = "Produktbreite und -höhe müssen > 0 sein.";
        bestMachineResult = null;
        document.getElementById("machineComparison").textContent = "Produktmaße eingeben, um Maschinen zu vergleichen.";
        return;
    }

    errorEl.textContent = "";

    // Gruppiere die Ergebnisse nach Maschine, um für jede den besten Wert zu finden
    let machineResults = {};
    const gap = parseInputValue("machineGap") || 0;

    allFormats.forEach(fmt => {
        let usableWidth = fmt.width;
        let usableHeight = fmt.height; 
        const machineSettings = machineSettingsByName[fmt.machine] || machineSettingsByName.SPS;
        const gripper = parseInputValue(machineSettings.gripper) || 0;

        // HARTE GREIFERKANTE: 10mm unten bei SPS und Thime
        let hasGripper = (fmt.machine === 'SPS' || fmt.machine === 'Thime 3020');
        if (hasGripper && !fmt.isRoll) {
            usableHeight -= gripper;
        }

        ORIENTATIONS.forEach(ori => {
            const tr = document.getElementById(`row-${fmt.id}-${ori}`);
            const piecesCell = document.getElementById(`pieces-${fmt.id}-${ori}`);
            const layoutCell = document.getElementById(`layout-${fmt.id}-${ori}`);
            const effCell = document.getElementById(`efficiency-${fmt.id}-${ori}`);
            
            if(!tr) return;

            tr.style.display = "table-row";
            tr.classList.remove("recommendation");

            if (usableWidth <= 0 || (!fmt.isRoll && usableHeight <= 0)) {
                piecesCell.textContent = "Kein Platz (Greiferkante beachten)";
                piecesCell.className = "muted";
                layoutCell.textContent = "–";
                effCell.textContent = "–";
                return;
            }

            const pW = ori === "h" ? productWidth : productHeight;
            const pH = ori === "h" ? productHeight : productWidth;

            if (fmt.isRoll) {
                if (isNaN(productionQuantity) || productionQuantity <= 0) {
                    piecesCell.textContent = "Bitte Produktionsmenge (Stk.) eingeben";
                    piecesCell.className = "muted";
                    layoutCell.textContent = "–";
                    effCell.textContent = "–";
                    return;
                }

                const countX = Math.floor((usableWidth + gap) / (pW + gap));
                if (countX <= 0) {
                    piecesCell.textContent = "Produkt zu breit für diese Rolle";
                    piecesCell.className = "muted";
                    layoutCell.textContent = "–";
                    effCell.textContent = "–";
                    return;
                }

                const requiredRows = Math.ceil(productionQuantity / countX);
                const lengthNeeded = (requiredRows * pH);

                const runMeters = (lengthNeeded / 1000).toLocaleString("de-DE", { maximumFractionDigits: 2 });
                
                piecesCell.textContent = `${runMeters} Laufmeter`;
                piecesCell.className = "";
                layoutCell.textContent = `${countX} nebeneinander × ${requiredRows} Reihen`;
                effCell.textContent = "–"; 
                
            } else {
                const productArea = productWidth * productHeight;
                const sheetArea = usableWidth * usableHeight;

                const countX = Math.floor((usableWidth + gap) / (pW + gap));
                const countY = Math.floor((usableHeight + gap) / (pH + gap));
                const pieces = Math.max(countX, 0) * Math.max(countY, 0);
                
                if (pieces === 0) {
                    piecesCell.textContent = "Passt nicht auf den Bogen";
                    piecesCell.className = "muted";
                    layoutCell.textContent = "–";
                    effCell.textContent = "–";
                } else {
                    const usedArea = pieces * productArea;
                    const efficiency = (usedArea / sheetArea) * 100;

                    let text = `${pieces} Nutzen`;
                    if (productionQuantity > 0) {
                        text += ` (ca. ${Math.ceil(productionQuantity / pieces)} Bogen)`;
                    }

                    piecesCell.textContent = text;
                    piecesCell.className = "";
                    layoutCell.textContent = `${countX} nebeneinander × ${countY} Reihen`;
                    effCell.textContent = formatPercent(efficiency);

                    if (!machineResults[fmt.machine]) machineResults[fmt.machine] = [];
                    machineResults[fmt.machine].push({ tr, pieces, efficiency, ori, fmtId: fmt.id });
                }
            }
        });

        // Verstecke vertikale Reihe, wenn sie identisch zur horizontalen ist
        if (!fmt.isRoll && machineResults[fmt.machine]) {
            const mRes = machineResults[fmt.machine];
            const hRes = mRes.find(r => r.fmtId === fmt.id && r.ori === "h");
            const vRes = mRes.find(r => r.fmtId === fmt.id && r.ori === "v");
            
            if (hRes && vRes && hRes.pieces > 0 && hRes.pieces === vRes.pieces && Math.abs(hRes.efficiency - vRes.efficiency) < 0.01) {
                document.getElementById(`row-${fmt.id}-v`).style.display = "none";
                machineResults[fmt.machine] = mRes.filter(r => !(r.fmtId === fmt.id && r.ori === "v"));
            }
        }
    });

    // Besten Bogen pro Maschine markieren
    for (const machineName in machineResults) {
        const resList = machineResults[machineName];
        if (resList.length > 0) {
            resList.sort((a, b) => {
                if (b.pieces !== a.pieces) return b.pieces - a.pieces;
                return b.efficiency - a.efficiency;
            });

            const best = resList[0];
            resList.forEach(res => {
                if (res.pieces === best.pieces && Math.abs(res.efficiency - best.efficiency) < 0.01) {
                    res.tr.classList.add("recommendation");
                }
            });
        }
    }

    const comparison = document.getElementById("machineComparison");
    const machineCandidates = Object.entries(machineResults).map(([machine, values]) => {
        const candidates = values.slice();
        const bestCandidate = candidates.sort((a, b) => b.pieces - a.pieces || b.efficiency - a.efficiency)[0];
        return bestCandidate ? { ...bestCandidate, machine } : null;
    }).filter(Boolean);
    const spsMinimum = getMachineRule("spsMinSheets", 300);
    const thimeMaximum = getMachineRule("thimeMaxSheets", 400);
    const primeMaximum = getMachineRule("primeMaxSheets", 50);
    const thimeCandidate = machineCandidates.find(candidate => candidate.machine === "Thime 3020");
    const thimeSupportsProduct = Boolean(thimeCandidate);
    const thimeSheets = thimeCandidate && productionQuantity > 0 ? Math.ceil(productionQuantity / thimeCandidate.pieces) : 0;
    const allowedCandidates = machineCandidates.filter(candidate => {
        const candidateSheets = productionQuantity > 0 ? Math.ceil(productionQuantity / candidate.pieces) : 0;
        if (candidate.machine === "SPS") return candidateSheets >= spsMinimum || !thimeSupportsProduct || thimeSheets > thimeMaximum;
        if (candidate.machine === "Thime 3020" && candidateSheets > thimeMaximum) return false;
        if (candidate.machine === "Fuji Prime 30" && candidateSheets > primeMaximum) return false;
        return true;
    });
    allowedCandidates.sort((a, b) => b.pieces - a.pieces || b.efficiency - a.efficiency);
    bestMachineResult = allowedCandidates[0] || null;
    comparison.innerHTML = allowedCandidates.length ? "" : "Keine Maschine erfüllt die Auswahlregeln.";
    if (allowedCandidates.length) {
        const grid = document.createElement("div");
        grid.className = "machine-comparison-grid";
        allowedCandidates.forEach((item, index) => {
            const card = document.createElement("div");
            card.className = `machine-comparison-item${index === 0 ? " best-machine" : ""}`;
            const name = document.createElement("strong");
            name.textContent = `${index === 0 ? "Beste Wahl: " : ""}${item.machine}`;
            const detail = document.createElement("span");
            const sheets = productionQuantity > 0 ? Math.ceil(productionQuantity / item.pieces) : "–";
            detail.textContent = `${item.pieces} Nutzen | ${formatPercent(item.efficiency)} | ${sheets} Bogen`;
            card.append(name, detail);
            grid.appendChild(card);
        });
        comparison.appendChild(grid);
    }
    if (typeof calculateMaterialCosts === "function") calculateMaterialCosts();
}

function onRowClick(fmt, orientation) {
    const wInput = document.getElementById("productWidth");
    const hInput = document.getElementById("productHeight");
    const qInput = document.getElementById("productionQuantity");
    const errorEl = document.getElementById("error");

    const productWidth = parseFloat(wInput.value.replace(",", "."));
    const productHeight = parseFloat(hInput.value.replace(",", "."));
    const productionQuantity = parseInt(qInput.value.replace(",", "."), 10);

    if (isNaN(productWidth) || productWidth <= 0 || isNaN(productHeight) || productHeight <= 0) {
        errorEl.textContent = "Für die Vorschau zuerst gültige Produktmaße eingeben.";
        return;
    }

    let sheetWidth = fmt.width;
    let sheetHeight = fmt.height;
    
    if (fmt.isRoll) {
        if (isNaN(productionQuantity) || productionQuantity <= 0) {
            errorEl.textContent = "Für die Rollenvorschau muss eine Stückmenge eingegeben werden.";
            return;
        }
        const pW = orientation === "h" ? productWidth : productHeight;
        const pH = orientation === "h" ? productHeight : productWidth;
        
        let uW = sheetWidth;
        const countX = Math.floor(uW / pW);
        if(countX <= 0) return; 

        const requiredRows = Math.ceil(productionQuantity / countX);
        sheetHeight = (requiredRows * pH);
    }

    let usableWidth = sheetWidth;
    let usableHeight = sheetHeight;
    let hasGripper = (fmt.machine === 'SPS' || fmt.machine === 'Thime 3020');

    const defaultSettings = machineSettingsByName[fmt.machine] || machineSettingsByName.SPS;
    const gripper = parseInputValue(defaultSettings.gripper) || 0;
    const gap = parseInputValue("machineGap") || 0;
    if (hasGripper && !fmt.isRoll) {
        usableHeight -= gripper;
    }

    if (usableWidth <= 0 || usableHeight <= 0) {
        errorEl.textContent = "Mit den aktuellen Einstellungen bleibt keine nutzbare Fläche.";
        return;
    }

    const orientationLabel = orientation === "h" ? "horizontal" : "vertikal";
    const title = fmt.name + " – " + orientationLabel + (hasGripper ? ` (inkl. ${formatNumber(gripper, 1)}mm Greifer unten)` : "");
    
    showPreview(fmt, orientation, sheetWidth, sheetHeight, usableWidth, usableHeight,
        productWidth, productHeight, hasGripper, title);
}

function showPreview(fmt, orientation, sheetWidth, sheetHeight, usableWidth, usableHeight,
    productWidth, productHeight, hasGripper, title) {
    const overlay = document.getElementById("previewOverlay");
    const titleEl = document.getElementById("previewTitle");
    const svg = document.getElementById("previewSvg");
    const previewSettings = machineSettingsByName[fmt.machine] || machineSettingsByName.SPS;
    const gripper = parseInputValue(previewSettings.gripper) || 0;
    const gap = parseInputValue("machineGap") || 0;

    titleEl.textContent = title;

    const existingDetails = document.getElementById("previewDetails");
    if (existingDetails) existingDetails.remove();

    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const viewW = 400;
    const viewH = 300;

    const scaleBase = Math.min((viewW - 40) / sheetWidth, (viewH - 40) / sheetHeight);
    const sheetWpx = sheetWidth * scaleBase;
    const sheetHpx = sheetHeight * scaleBase;
    const sheetX = (viewW - sheetWpx) / 2;
    const sheetY = (viewH - sheetHpx) / 2;

    svg.setAttribute("viewBox", `0 0 ${viewW} ${viewH}`);
    
    // Hintergrundbogen (Papierweiß/Grau)
    const sheetRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    sheetRect.setAttribute("x", sheetX);
    sheetRect.setAttribute("y", sheetY);
    sheetRect.setAttribute("width", sheetWpx);
    sheetRect.setAttribute("height", sheetHpx);
    sheetRect.setAttribute("fill", "#ffffff"); 
    sheetRect.setAttribute("stroke", "#94a3b8");
    sheetRect.setAttribute("stroke-width", "1");
    svg.appendChild(sheetRect);

    // Fester Greifer unten (Rot)
    if (hasGripper && !fmt.isRoll) {
        const gripperPx = gripper * scaleBase;
        const gripperRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        gripperRect.setAttribute("x", sheetX); 
        gripperRect.setAttribute("y", sheetY + sheetHpx - gripperPx);
        gripperRect.setAttribute("width", sheetWpx); 
        gripperRect.setAttribute("height", gripperPx);
        gripperRect.setAttribute("fill", "#fca5a5"); // Rötlich
        gripperRect.setAttribute("stroke", "#ef4444");
        gripperRect.setAttribute("fill-opacity", "0.8");
        svg.appendChild(gripperRect);
    }

    let usableX = sheetX;
    let usableY = sheetY;
    let usableWpx = sheetWpx;
    let usableHpx = sheetHpx;

    if (hasGripper && !fmt.isRoll) {
        usableHpx -= (gripper * scaleBase);
    }

    // Nutzbare Fläche (Grün gestrichelt zur klaren Trennung)
    if (usableWpx > 0 && usableHpx > 0) {
        const usableRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        usableRect.setAttribute("x", usableX); usableRect.setAttribute("y", usableY);
        usableRect.setAttribute("width", usableWpx); usableRect.setAttribute("height", usableHpx);
        usableRect.setAttribute("fill", "transparent");
        usableRect.setAttribute("stroke", "#22c55e");
        usableRect.setAttribute("stroke-dasharray", "4 4");
        usableRect.setAttribute("stroke-width", "1.5");
        svg.appendChild(usableRect);
    }

    const prodWmm = orientation === "h" ? productWidth : productHeight;
    const prodHmm = orientation === "h" ? productHeight : productWidth;
    const prodWpx = prodWmm * scaleBase;
    const prodHpx = prodHmm * scaleBase;

    let countX = Math.floor((usableWpx + gap * scaleBase) / (prodWpx + gap * scaleBase));
    let countY = Math.floor((usableHpx + gap * scaleBase) / (prodHpx + gap * scaleBase));
    
    const qInput = parseInt(document.getElementById("productionQuantity").value, 10);
    let totalDrawn = 0;
    const gridWidth = countX * prodWpx + Math.max(0, countX - 1) * gap * scaleBase;
    const gridHeight = countY * prodHpx + Math.max(0, countY - 1) * gap * scaleBase;
    const offsetX = (usableWpx - gridWidth) / 2;
    const offsetY = (usableHpx - gridHeight) / 2;

    for (let iy = 0; iy < countY; iy++) {
        for (let ix = 0; ix < countX; ix++) {
            if (fmt.isRoll && totalDrawn >= qInput) break;

            const x = usableX + offsetX + ix * (prodWpx + gap * scaleBase);
            const y = usableY + offsetY + iy * (prodHpx + gap * scaleBase);
            const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            r.setAttribute("x", x + 0.5); r.setAttribute("y", y + 0.5);
            r.setAttribute("width", prodWpx - 1); r.setAttribute("height", prodHpx - 1);
            r.setAttribute("fill", document.body.classList.contains("admin-mode") ? "#dc2626" : "#3b82f6"); // Adminmodus nutzt rote Nutzenflächen
            r.setAttribute("fill-opacity", "0.85");
            r.setAttribute("stroke", "#ffffff"); // Weißer Rand für perfekte Trennung
            r.setAttribute("stroke-width", "1");
            svg.appendChild(r);
            totalDrawn++;
        }
    }

    const pieces = Math.max(countX, 0) * Math.max(countY, 0);
    const prodArea = productWidth * productHeight;
    const sheetArea = usableWidth * usableHeight;
    const efficiency = pieces > 0 ? ((totalDrawn > 0 ? totalDrawn : pieces) * prodArea / sheetArea) * 100 : 0;

    const layoutText = `${countX} nebeneinander × ${fmt.isRoll ? Math.ceil(qInput/countX) : countY} Reihen`;
    let detailsHTML = `<div style="color: var(--text-muted);">Ausrichtung: ${orientation === "h" ? "horizontal" : "vertikal"}</div>`;
    detailsHTML += `<div style="color: var(--text-muted);">${layoutText}</div>`;
    
    if(!fmt.isRoll) {
        detailsHTML += `<div style="margin-top: 4px;">Flächenausnutzung (nutzbarer Bereich): <strong>${formatPercent(efficiency)}</strong></div>`;
    } else {
        const lengthM = (sheetHeight / 1000).toLocaleString("de-DE", { maximumFractionDigits: 2 });
        detailsHTML += `<div style="margin-top: 4px;">Berechnete Laufmeter: <strong>${lengthM} m</strong></div>`;
    }

    const detailsDiv = document.createElement("div");
    detailsDiv.id = "previewDetails";
    detailsDiv.style.marginTop = "15px";
    detailsDiv.style.textAlign = "center";
    detailsDiv.style.fontSize = "0.9rem";
    detailsDiv.style.color = "var(--text-main)";
    detailsDiv.innerHTML = detailsHTML;

    svg.parentElement.insertAdjacentElement('afterend', detailsDiv);
    overlay.style.display = "flex";
}

let inkScreens = [];

function defaultInkVolume(mesh) {
    const meshNumber = Number.parseInt(mesh, 10);
    if (meshNumber >= 90) return 14;
    if (meshNumber >= 54) return 28;
    return 55;
}

function formatNumber(value, maximumFractionDigits = 2) {
    return value.toLocaleString("de-DE", { maximumFractionDigits });
}

function loadInkScreens() {
    try {
        inkScreens = JSON.parse(localStorage.getItem("inkScreens") || "[]");
    } catch (e) {
        inkScreens = [];
    }
}

function saveInkScreens() {
    localStorage.setItem("inkScreens", JSON.stringify(inkScreens));
}

function loadInkSettings() {
    try {
        const settings = JSON.parse(localStorage.getItem("inkCalculationSettings") || "{}");
        document.getElementById("inkDensity").value = settings.density ?? "";
        document.getElementById("inkSurcharge").value = settings.surcharge ?? "";
    } catch (e) {
        console.error("Fehler beim Laden der Farbverbrauchseinstellungen", e);
    }
}

function saveInkSettings() {
    localStorage.setItem("inkCalculationSettings", JSON.stringify({
        density: document.getElementById("inkDensity").value,
        surcharge: document.getElementById("inkSurcharge").value
    }));
}

function renderInkScreens() {
    const list = document.getElementById("screenList");
    list.innerHTML = "";

    if (inkScreens.length === 0) {
        list.textContent = "Noch keine Siebe gespeichert.";
        list.className = "screen-list muted";
        return;
    }

    inkScreens.forEach(screen => {
        const item = document.createElement("div");
        item.className = "screen-item";
        const meshLabel = document.createElement("strong");
        meshLabel.textContent = screen.mesh;
        const consumptionLabel = document.createElement("span");
        consumptionLabel.textContent = `${formatNumber(screen.volume ?? screen.consumption ?? defaultInkVolume(screen.mesh), 1)} cm³/m²`;
        item.append(meshLabel, consumptionLabel);
        const deleteButton = document.createElement("button");
        deleteButton.className = "screen-delete";
        deleteButton.type = "button";
        deleteButton.textContent = "×";
        deleteButton.title = "Sieb löschen";
        deleteButton.addEventListener("click", () => {
            inkScreens = inkScreens.filter(savedScreen => savedScreen.id !== screen.id);
            saveInkScreens();
            renderInkScreens();
            calculateInkConsumption();
        });
        item.appendChild(deleteButton);
        list.appendChild(item);
    });
    list.className = "screen-list";
}

function calculateInkConsumption() {
    const results = document.getElementById("inkResults");
    const length = parseFloat(document.getElementById("inkLength").value.replace(",", "."));
    const width = parseFloat(document.getElementById("inkWidth").value.replace(",", "."));
    const quantity = parseFloat(document.getElementById("inkQuantity").value.replace(",", "."));
    const coverage = 100;
    const densityInput = document.getElementById("inkDensity").value.trim();
    const density = densityInput ? parseFloat(densityInput.replace(",", ".")) : 1.2;
    const surchargeInput = document.getElementById("inkSurcharge").value.trim();
    const surcharge = surchargeInput ? parseFloat(surchargeInput.replace(",", ".")) : 15;
    const invalidMessage = "Bitte Sieb, Länge, Breite, Bedruckungsgrad und eine Auflage größer als 0 eingeben. Die Dichte muss größer als 0 sein.";

    if (inkScreens.length === 0 || !Number.isFinite(length) || length <= 0 || !Number.isFinite(width) || width <= 0 || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(coverage) || coverage < 0 || coverage > 100 || !Number.isFinite(density) || density <= 0 || !Number.isFinite(surcharge) || surcharge < 0) {
        results.innerHTML = "";
        const result = document.createElement("div");
        result.className = "ink-result";
            result.textContent = invalidMessage;
        results.appendChild(result);
        return;
    }

    const areaInSquareMeters = (length * width / 10000) * (coverage / 100);
    results.innerHTML = "";
    inkScreens.forEach(screen => {
        const volume = screen.volume ?? screen.consumption ?? defaultInkVolume(screen.mesh);
        const theoreticalPerPrint = areaInSquareMeters * volume * density;
        const pureNeed = theoreticalPerPrint * quantity;
        const totalNeed = pureNeed * (1 + surcharge / 100);
        const result = document.createElement("div");
        result.className = "ink-result";
        const title = document.createElement("small");
        title.textContent = `Farbe (alle Farben gleich) | Siebgewebe: ${screen.mesh} | Farbvolumen: ${formatNumber(volume, 1)} cm³/m²`;
            const total = document.createElement("strong");
            total.textContent = `${formatNumber(totalNeed / 1000)} kg (${formatNumber(totalNeed)} g)`;
        const details = document.createElement("span");
        details.textContent = `Reiner Bedarf: ${formatNumber(pureNeed)} g | Praxisaufschlag: ${surcharge} %`;
        result.append(title, total, details);
        results.appendChild(result);
    });
}

const materialSettingIds = ["materialName", "materialPrice", "sheetLength", "sheetWidth", "materialWaste", "setupCost", "hourlyRate", "productionHours"];

function parseInputValue(id) {
    return parseFloat(document.getElementById(id).value.replace(",", "."));
}

function loadMaterialSettings() {
    try {
        const settings = JSON.parse(localStorage.getItem("materialSettings") || "{}");
        [...materialSettingIds, ...materialCostIds].forEach(id => {
            if (settings[id] !== undefined) document.getElementById(id).value = settings[id];
        });
    } catch (e) {
        console.error("Fehler beim Laden der Kalkulationsgrunddaten", e);
    }
}

function calculateMaterialCosts() {
    const result = document.getElementById("materialResult");
    const productLength = parseInputValue("materialProductLength");
    const productWidth = parseInputValue("materialProductWidth");
    const quantity = parseInputValue("materialQuantity");
    const materialPrice = parseInputValue("materialPrice");
    const sheetLength = parseInputValue("sheetLength");
    const sheetWidth = parseInputValue("sheetWidth");
    const waste = parseInputValue("materialWaste");
    const setupCost = parseInputValue("setupCost");
    const hourlyRate = parseInputValue("hourlyRate");
    const productionHours = parseInputValue("productionHours");
    const prepressCost = parseInputValue("prepressCost") || 0;
    const packagingCost = parseInputValue("packagingCost") || 0;
    const profitMargin = parseInputValue("materialProfitMargin") || 0;
    const vat = parseInputValue("materialVat") || 0;

    const requiredValues = [productLength, productWidth, quantity, materialPrice, sheetLength, sheetWidth, waste, setupCost, hourlyRate, productionHours];
    if (requiredValues.some(value => !Number.isFinite(value) || value < 0) || productLength === 0 || productWidth === 0 || quantity === 0 || sheetLength === 0 || sheetWidth === 0) {
        result.textContent = "Bitte Grunddaten, Produktformat und Auflage vollständig eingeben.";
        return;
    }

    const productArea = (productLength / 1000) * (productWidth / 1000);
    const netMaterialArea = productArea * quantity;
    const totalMaterialArea = netMaterialArea * (1 + waste / 100);
    const sheetArea = (sheetLength / 1000) * (sheetWidth / 1000);
    const sheetsNeeded = bestMachineResult && bestMachineResult.pieces > 0 ? Math.ceil(quantity / bestMachineResult.pieces) : Math.ceil(totalMaterialArea / sheetArea);
    const purchasedArea = sheetsNeeded * sheetArea;
    const materialCost = purchasedArea * materialPrice;
    const speedSetting = bestMachineResult ? (machineSettingsByName[bestMachineResult.machine] || {}).speed : null;
    const machineSpeed = speedSetting ? parseInputValue(speedSetting) || 0 : 0;
    const effectiveProductionHours = productionHours > 0 ? productionHours : (bestMachineResult && machineSpeed > 0 ? sheetsNeeded / machineSpeed : 0);
    const laborCost = effectiveProductionHours * hourlyRate;
    const subtotal = materialCost + setupCost + laborCost + prepressCost + packagingCost;
    const saleNet = subtotal * (1 + profitMargin / 100);
    const saleGross = saleNet * (1 + vat / 100);

    result.innerHTML = "";
    const headline = document.createElement("strong");
    headline.textContent = "Kalkulation";
    const materialName = document.getElementById("materialName").value.trim();
    if (materialName) headline.appendChild(document.createTextNode(` – ${materialName}`));
    result.appendChild(headline);
    const grid = document.createElement("div");
    grid.className = "material-result-grid";
    [["Beste Maschine", bestMachineResult ? bestMachineResult.machine : "Keine Auswahl"], ["Benötigte Materialfläche", `${formatNumber(totalMaterialArea)} m²`], ["Benötigte Bogen", `${sheetsNeeded}`], ["Materialkosten", `${formatNumber(materialCost)} €`], ["Rüstkosten", `${formatNumber(setupCost)} €`], ["Vorstufe / Belichtung", `${formatNumber(prepressCost)} €`], ["Maschinen-/Arbeitskosten", `${formatNumber(laborCost)} €`], ["Verpackung / Versand", `${formatNumber(packagingCost)} €`], ["Selbstkosten", `${formatNumber(subtotal)} €`], ["Gewinnaufschlag", `${formatNumber(profitMargin, 1)} %`], ["Verkaufspreis netto", `${formatNumber(saleNet)} €`], ["Verkaufspreis brutto", `${formatNumber(saleGross)} €`]].forEach(([label, value]) => {
        const item = document.createElement("div");
        item.className = "material-result-item";
        const labelElement = document.createElement("span");
        labelElement.textContent = label;
        const valueElement = document.createElement("strong");
        valueElement.textContent = value;
        item.append(labelElement, valueElement);
        grid.appendChild(item);
    });
    result.appendChild(grid);
}

function renderMaterialProfiles() {
    const list = document.getElementById("materialProfileList");
    let profiles = [];
    try { profiles = JSON.parse(localStorage.getItem("materialProfiles") || "[]"); } catch (e) { profiles = []; }
    list.innerHTML = "";
    profiles.forEach(profile => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = profile.name;
        button.title = "Materialprofil laden";
        button.addEventListener("click", () => {
            const settings = profile.settings || { materialName: profile.name, materialPrice: profile.price };
            [...materialSettingIds, ...materialCostIds].forEach(id => {
                if (settings[id] !== undefined) document.getElementById(id).value = settings[id];
            });
            calculateMaterialCosts();
        });
        list.appendChild(button);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const tabButtons = document.querySelectorAll(".tab-button");
    const tabPanels = document.querySelectorAll(".tab-panel");
    const materialTab = document.getElementById("tab-material");
    const adminSettingsSections = document.getElementById("adminSettingsSections");
    const inkSettings = document.getElementById("inkSettings");
    const materialSettings = document.getElementById("materialSettings");
    document.getElementById("inkSettingsHost").appendChild(inkSettings);
    document.getElementById("materialSettingsHost").appendChild(materialSettings);

    function updateAdminVisibility(isAdmin) {
        document.body.classList.toggle("admin-mode", isAdmin);
        document.querySelectorAll(".btn-primary").forEach(button => {
            if (isAdmin) {
                button.style.setProperty("background-color", document.body.classList.contains("dark-mode") ? "#f87171" : "#dc2626", "important");
            } else {
                button.style.removeProperty("background-color");
            }
        });
        materialTab.hidden = !isAdmin;
        document.getElementById("resetSettingsBtn").hidden = !isAdmin;
        document.getElementById("adminBadge").hidden = !isAdmin;
        adminSettingsSections.hidden = !isAdmin;
        inkSettings.hidden = !isAdmin;
        materialSettings.hidden = !isAdmin;
        if (!isAdmin && document.getElementById("panel-material").classList.contains("active")) {
            document.getElementById("tab-utilization").click();
        }
    }

    updateAdminVisibility(sessionStorage.getItem("isAdmin") === "true");

    tabButtons.forEach(button => {
        button.addEventListener("click", () => {
            const targetId = button.dataset.tab;

            tabButtons.forEach(tab => {
                const isActive = tab === button;
                tab.classList.toggle("active", isActive);
                tab.setAttribute("aria-selected", isActive ? "true" : "false");
            });

            tabPanels.forEach(panel => {
                const isActive = panel.id === targetId;
                panel.classList.toggle("active", isActive);
                panel.hidden = !isActive;
            });
        });
    });

    const generalSettings = document.getElementById("generalSettings");
    document.getElementById("generalSettingsBtn").addEventListener("click", () => {
        const isOpen = !generalSettings.hidden;
        generalSettings.hidden = isOpen;
        document.getElementById("generalSettingsBtn").setAttribute("aria-expanded", String(!isOpen));
    });
    document.getElementById("lightModeBtn").addEventListener("click", () => {
        document.body.classList.remove("dark-mode");
        localStorage.setItem("theme", "light");
        updateThemeButton(false);
    });
    document.getElementById("resetSettingsBtn").addEventListener("click", () => {
        if (!confirm("Alle lokal gespeicherten Settings löschen?")) return;
        ["customFormats", "inkScreens", "inkCalculationSettings", "materialSettings", "materialProfiles", "machineSettings", "theme"].forEach(key => localStorage.removeItem(key));
        sessionStorage.removeItem("isAdmin");
        window.location.reload();
    });
    document.getElementById("adminLoginBtn").addEventListener("click", () => {
        const user = document.getElementById("adminUser").value;
        const password = document.getElementById("adminPassword").value;
        const status = document.getElementById("adminStatus");
        if (user === "sj" && password === "sj") {
            sessionStorage.setItem("isAdmin", "true");
            updateAdminVisibility(true);
            generalSettings.hidden = false;
            document.getElementById("generalSettingsBtn").setAttribute("aria-expanded", "true");
            status.textContent = "Adminzugang aktiviert.";
        } else {
            status.textContent = "Benutzername oder Passwort ist falsch.";
        }
    });
    document.getElementById("adminLogoutBtn").addEventListener("click", () => {
        sessionStorage.removeItem("isAdmin");
        updateAdminVisibility(false);
        document.getElementById("adminStatus").textContent = "Admin abgemeldet.";
    });

    loadInkScreens();
    renderInkScreens();
    loadInkSettings();
    ["inkLength", "inkWidth", "inkQuantity"].forEach(id => {
        document.getElementById(id).addEventListener("input", calculateInkConsumption);
        document.getElementById(id).addEventListener("change", calculateInkConsumption);
    });
    calculateInkConsumption();
    ["inkDensity", "inkSurcharge"].forEach(id => {
        document.getElementById(id).addEventListener("input", () => {
            calculateInkConsumption();
            const width = parseInputValue("dashboardWidth");
            const height = parseInputValue("dashboardHeight");
            const quantity = parseInputValue("dashboardQuantity");
            if (width > 0 && height > 0 && quantity > 0) renderDashboardInkResult(width, height, quantity);
        });
    });
    document.getElementById("saveInkSettingsBtn").addEventListener("click", () => {
        const density = parseFloat(document.getElementById("inkDensity").value.replace(",", "."));
        const surcharge = parseFloat(document.getElementById("inkSurcharge").value.replace(",", "."));
        const status = document.getElementById("inkSettingsStatus");
        if (!Number.isFinite(density) || density <= 0 || !Number.isFinite(surcharge) || surcharge < 0) {
            status.textContent = "Bitte gültige Werte für Dichte und Zuschuss eingeben.";
            return;
        }
        saveInkSettings();
        status.textContent = "Farbverbrauchseinstellungen gespeichert.";
        calculateInkConsumption();
    });
    document.getElementById("addScreenBtn").addEventListener("click", () => {
        const meshInput = document.getElementById("screenMesh");
        const consumptionInput = document.getElementById("screenConsumption");
        const mesh = meshInput.value.trim();
        const volume = parseFloat(consumptionInput.value.replace(",", "."));
        const error = document.getElementById("screenError");

        if (!mesh || (Number.isFinite(volume) && volume < 0)) {
            error.textContent = "Bitte ein Siebgewebe und ein gültiges Farbvolumen eingeben.";
            return;
        }

        inkScreens.push({ id: `screen-${Date.now()}`, mesh, volume: Number.isFinite(volume) && volume > 0 ? volume : defaultInkVolume(mesh) });
        saveInkScreens();
        renderInkScreens();
        meshInput.value = "";
        consumptionInput.value = "";
        error.textContent = "";
        calculateInkConsumption();
        const dashboardWidth = parseInputValue("dashboardWidth");
        const dashboardHeight = parseInputValue("dashboardHeight");
        const dashboardQuantity = parseInputValue("dashboardQuantity");
        if (dashboardWidth > 0 && dashboardHeight > 0 && dashboardQuantity > 0) renderDashboardInkResult(dashboardWidth, dashboardHeight, dashboardQuantity);
    });

    loadMaterialSettings();
    renderMaterialProfiles();
    document.getElementById("saveMaterialSettingsBtn").addEventListener("click", () => {
        const settings = {};
        [...materialSettingIds, ...materialCostIds].forEach(id => settings[id] = document.getElementById(id).value);
        localStorage.setItem("materialSettings", JSON.stringify(settings));
        document.getElementById("materialSettingsStatus").textContent = "Grunddaten lokal gespeichert.";
        calculateMaterialCosts();
    });
    ["materialProductLength", "materialProductWidth", "materialQuantity", ...materialSettingIds, ...materialCostIds].forEach(id => {
        document.getElementById(id).addEventListener("input", calculateMaterialCosts);
    });
    document.getElementById("saveMaterialProfileBtn").addEventListener("click", () => {
        const nameInput = document.getElementById("materialProfileName");
        const name = nameInput.value.trim();
        if (!name) return;
        let profiles = [];
        try { profiles = JSON.parse(localStorage.getItem("materialProfiles") || "[]"); } catch (e) { profiles = []; }
        profiles = profiles.filter(profile => profile.name !== name);
        const settings = {};
        [...materialSettingIds, ...materialCostIds].forEach(id => settings[id] = document.getElementById(id).value);
        profiles.push({ name, settings });
        localStorage.setItem("materialProfiles", JSON.stringify(profiles));
        nameInput.value = "";
        renderMaterialProfiles();
        document.getElementById("materialSettingsStatus").textContent = "Materialprofil lokal gespeichert.";
    });
    ["dashboardWidth", "dashboardHeight", "dashboardQuantity"].forEach(id => document.getElementById(id).addEventListener("input", renderDashboardComparison));
    document.querySelectorAll("[data-open-tab]").forEach(button => button.addEventListener("click", () => document.querySelector(`[data-tab=\"${button.dataset.openTab}\"]`).click()));
    [...machineSettingIds, ...machineRuleIds].forEach(id => {
        document.getElementById(id).addEventListener("input", () => {
            const settings = {};
            [...machineSettingIds, ...machineRuleIds].forEach(settingId => settings[settingId] = document.getElementById(settingId).value);
            localStorage.setItem("machineSettings", JSON.stringify(settings));
            recalc();
        });
    });
    try {
        const settings = JSON.parse(localStorage.getItem("machineSettings") || "{}");
        [...machineSettingIds, ...machineRuleIds].forEach(id => { if (settings[id] !== undefined) document.getElementById(id).value = settings[id]; });
    } catch (e) { /* Defaults remain active. */ }

    loadCustomFormats();
    renderTables();

    ["productWidth", "productHeight", "productionQuantity"].forEach(id => {
        document.getElementById(id).addEventListener("input", recalc);
    });

    // Toggle für Höhe bei eigenen Formaten
    const customTargetMachines = document.getElementById("customTargetMachines");
    const customHeightWrapper = document.getElementById("customHeightWrapper");
    
    customTargetMachines.addEventListener("change", () => {
        const checked = document.querySelectorAll('#customTargetMachines input:checked');
        let onlyRolls = true;
        
        if (checked.length === 0) onlyRolls = false; // Verhindert Fehler, wenn alles abgewählt ist

        checked.forEach(cb => {
            if (!cb.classList.contains("roll-cb")) onlyRolls = false;
        });

        if (onlyRolls) {
            customHeightWrapper.style.display = "none";
        } else {
            customHeightWrapper.style.display = "block";
        }
    });

    // Eigenes Format hinzufügen (für alle gewählten Maschinen)
    document.getElementById("addFormatBtn").addEventListener("click", () => {
        const checkboxes = document.querySelectorAll('#customTargetMachines input:checked');
        const errorEl = document.getElementById("error");
        
        if (checkboxes.length === 0) {
            errorEl.textContent = "Bitte mindestens eine Zielmaschine auswählen.";
            return;
        }

        const wInput = document.getElementById("customWidth");
        const hInput = document.getElementById("customHeight");
        const wValRaw = parseFloat(wInput.value.replace(",", "."));
        const hValRaw = parseFloat(hInput.value.replace(",", "."));

        let hasError = false;
        const newFormats = [];
        const timestamp = Date.now();

        checkboxes.forEach((cb, i) => {
            const targetMachine = cb.value;
            const isRoll = cb.classList.contains("roll-cb");

            if (isNaN(wValRaw) || wValRaw <= 0 || (!isRoll && (isNaN(hValRaw) || hValRaw <= 0))) {
                hasError = true;
                return;
            }

            let category = "Siebdruck";
            if (targetMachine.includes("Fuji") || targetMachine.includes("Mimaki")) {
                category = "Digitaldruck";
            }

            const newFormat = {
                id: `custom-${timestamp}-${i}`,
                category: category,
                machine: targetMachine,
                isCustom: true,
                isRoll: isRoll
            };

            if (isRoll) {
                newFormat.name = `${wValRaw} mm Rolle (Eigenes)`;
                newFormat.width = wValRaw;
            } else {
                const wVal = Math.max(wValRaw, hValRaw);
                const hVal = Math.min(wValRaw, hValRaw);
                newFormat.name = `${wVal} × ${hVal} mm (Eigenes)`;
                newFormat.width = wVal;
                newFormat.height = hVal;
            }
            newFormats.push(newFormat);
        });

        if (hasError) {
            errorEl.textContent = "Bitte gültige Maße für das eigene Format eingeben.";
            return;
        }

        errorEl.textContent = "";
        allFormats = [...allFormats, ...newFormats];
        saveCustomFormats();
        
        wInput.value = "";
        hInput.value = "";

        renderTables();
        recalc();
    });

    const overlay = document.getElementById("previewOverlay");
    document.getElementById("previewClose").addEventListener("click", () => overlay.style.display = "none");
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.style.display = "none"; });

    function updateThemeButton(isDark) {
        document.body.classList.toggle("dark-mode", isDark);
    }

    updateThemeButton(localStorage.getItem("theme") === "dark");
});
