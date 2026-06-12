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
        renderTables();
        return;
    }

    if (isNaN(productWidth) || productWidth <= 0 || isNaN(productHeight) || productHeight <= 0) {
        errorEl.textContent = "Produktbreite und -höhe müssen > 0 sein.";
        return;
    }

    errorEl.textContent = "";

    // Gruppiere die Ergebnisse nach Maschine, um für jede den besten Wert zu finden
    let machineResults = {};

    allFormats.forEach(fmt => {
        let usableWidth = fmt.width;
        let usableHeight = fmt.height; 

        // HARTE GREIFERKANTE: 10mm unten bei SPS und Thime
        let hasGripper = (fmt.machine === 'SPS' || fmt.machine === 'Thime 3020');
        if (hasGripper && !fmt.isRoll) {
            usableHeight -= 10;
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

                const countX = Math.floor(usableWidth / pW);
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

                const countX = Math.floor(usableWidth / pW);
                const countY = Math.floor(usableHeight / pH);
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

    if (hasGripper && !fmt.isRoll) {
        usableHeight -= 10;
    }

    if (usableWidth <= 0 || usableHeight <= 0) {
        errorEl.textContent = "Mit den aktuellen Einstellungen bleibt keine nutzbare Fläche.";
        return;
    }

    const orientationLabel = orientation === "h" ? "horizontal" : "vertikal";
    const title = fmt.name + " – " + orientationLabel + (hasGripper ? " (inkl. 10mm Greifer unten)" : "");
    
    showPreview(fmt, orientation, sheetWidth, sheetHeight, usableWidth, usableHeight,
        productWidth, productHeight, hasGripper, title);
}

function showPreview(fmt, orientation, sheetWidth, sheetHeight, usableWidth, usableHeight,
    productWidth, productHeight, hasGripper, title) {
    const overlay = document.getElementById("previewOverlay");
    const titleEl = document.getElementById("previewTitle");
    const svg = document.getElementById("previewSvg");

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
        const gripperPx = 10 * scaleBase;
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
        usableHpx -= (10 * scaleBase);
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

    let countX = Math.floor(usableWpx / prodWpx);
    let countY = Math.floor(usableHpx / prodHpx);
    
    const qInput = parseInt(document.getElementById("productionQuantity").value, 10);
    let totalDrawn = 0;

    for (let iy = 0; iy < countY; iy++) {
        for (let ix = 0; ix < countX; ix++) {
            if (fmt.isRoll && totalDrawn >= qInput) break;

            const x = usableX + ix * prodWpx;
            const y = usableY + iy * prodHpx;
            const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            r.setAttribute("x", x + 0.5); r.setAttribute("y", y + 0.5);
            r.setAttribute("width", prodWpx - 1); r.setAttribute("height", prodHpx - 1);
            r.setAttribute("fill", "#3b82f6"); // Starkes Blau
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
    let detailsHTML = `<div style="color: var(--text-muted);">${layoutText}</div>`;
    
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

document.addEventListener("DOMContentLoaded", () => {
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

    const themeToggleBtn = document.getElementById("themeToggle");
    const iconSpan = themeToggleBtn.querySelector(".icon");
    const textSpan = themeToggleBtn.querySelector("span:last-child");

    function updateTheme(isDark) {
        if (isDark) {
            document.body.classList.add("dark-mode");
            iconSpan.textContent = "☀️";
            textSpan.textContent = "Light Mode";
        } else {
            document.body.classList.remove("dark-mode");
            iconSpan.textContent = "🌙";
            textSpan.textContent = "Dark Mode";
        }
    }

    if (localStorage.getItem("theme") === "dark") updateTheme(true);

    themeToggleBtn.addEventListener("click", () => {
        const isDark = document.body.classList.contains("dark-mode");
        updateTheme(!isDark);
        localStorage.setItem("theme", !isDark ? "dark" : "light");
    });
});
