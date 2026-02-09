const sheetFormats = [
    { name: "1030 × 540 mm", width: 1030, height: 540 },
    { name: "930 × 630 mm", width: 930, height: 630 },
    { name: "1000 × 700 mm", width: 1000, height: 700 },
    { name: "700 × 500 mm", width: 700, height: 500 },
    { name: "540 × 515 mm", width: 540, height: 515 },
    { name: "540 × 343 mm", width: 540, height: 343 },
    { name: "630 × 465 mm", width: 630, height: 465 },
    { name: "630 × 310 mm", width: 630, height: 310 }
];

const ORIENTATIONS = ["h", "v"]; // h = horizontal, v = vertikal

function formatPercent(value) {
    if (!isFinite(value) || value < 0) return "–";
    return value.toLocaleString("de-DE", { maximumFractionDigits: 1 }) + " %";
}

function createInitialRows() {
    const tbody = document.getElementById("resultsBody");
    tbody.innerHTML = "";
    sheetFormats.forEach((fmt, index) => {
        ORIENTATIONS.forEach((ori) => {
            const tr = document.createElement("tr");
            tr.dataset.formatIndex = String(index);
            tr.dataset.formatIndex = String(index);
            tr.dataset.orientation = ori;

            // Coloring based on format index
            if (index % 2 !== 0) {
                tr.classList.add("row-alt-bg");
            }

            const tdFormat = document.createElement("td");
            tdFormat.className = "format-col";
            tdFormat.setAttribute("data-label", "Druckbogen");
            tdFormat.textContent = fmt.name;
            tr.appendChild(tdFormat);

            const tdOri = document.createElement("td");
            tdOri.id = "ori-" + index + "-" + ori;
            tdOri.setAttribute("data-label", "Ausrichtung");
            tdOri.textContent = ori === "h" ? "horizontal (nicht gedreht)" : "vertikal (gedreht)";
            tr.appendChild(tdOri);

            const tdPieces = document.createElement("td");
            tdPieces.id = "pieces-" + index + "-" + ori;
            tdPieces.setAttribute("data-label", "Nutzen");
            tdPieces.className = "muted";
            tdPieces.textContent = "Bitte Produktmaße eingeben";
            tr.appendChild(tdPieces);

            const tdLayout = document.createElement("td");
            tdLayout.id = "layout-" + index + "-" + ori;
            tdLayout.className = "col-layout";
            tdLayout.setAttribute("data-label", "Anordnung");
            tdLayout.textContent = "–";
            tr.appendChild(tdLayout);

            const tdEfficiency = document.createElement("td");
            tdEfficiency.id = "efficiency-" + index + "-" + ori;
            tdEfficiency.className = "col-efficiency";
            tdEfficiency.setAttribute("data-label", "Flächenausnutzung");
            tdEfficiency.textContent = "–";
            tr.appendChild(tdEfficiency);

            tr.addEventListener("click", onRowClick);

            tbody.appendChild(tr);
        });
    });
}

function recalc() {
    const wInput = document.getElementById("productWidth");
    const hInput = document.getElementById("productHeight");
    const qInput = document.getElementById("productionQuantity");
    const passerInput = document.getElementById("passer");
    const gripperValueInput = document.getElementById("gripperValue");
    const gripperSideSelect = document.getElementById("gripperSide");
    const errorEl = document.getElementById("error");

    const wValue = wInput.value.replace(",", ".");
    const hValue = hInput.value.replace(",", ".");
    const qValueRaw = qInput.value.replace(",", "."); // Menge
    const passerValueRaw = passerInput.value.replace(",", ".");
    const gripperValueRaw = gripperValueInput.value.replace(",", ".");

    const productWidth = parseFloat(wValue);
    const productHeight = parseFloat(hValue);
    const productionQuantity = parseInt(qValueRaw, 10); // Menge als Integer
    let passer = parseFloat(passerValueRaw);
    let gripperValue = parseFloat(gripperValueRaw);
    const gripperSide = gripperSideSelect.value;

    if (!wValue && !hValue) {
        errorEl.textContent = "";
        createInitialRows();
        return;
    }

    if (isNaN(productWidth) || productWidth <= 0 || isNaN(productHeight) || productHeight <= 0) {
        errorEl.textContent = "Produktbreite und -höhe müssen > 0 sein.";
        return;
    }

    if (isNaN(passer) || passer < 0) passer = 0;
    if (isNaN(gripperValue) || gripperValue < 0) gripperValue = 0;

    errorEl.textContent = "";

    let results = [];

    // Helper for display text
    function getPiecesText(pieces) {
        let text = pieces.toString() + " Nutzen";
        if (productionQuantity > 0 && pieces > 0) {
            const requiredSheets = Math.ceil(productionQuantity / pieces);
            text += ` (ca. ${requiredSheets} Bogen)`;
        }
        return text;
    }

    sheetFormats.forEach((fmt, index) => {
        const sheetWidth = fmt.width;
        const sheetHeight = fmt.height;

        let usableWidth = sheetWidth;
        let usableHeight = sheetHeight;

        // Greiferkante
        if (gripperValue > 0 && gripperSide !== "none") {
            if (gripperSide === "links" || gripperSide === "rechts") {
                usableWidth -= gripperValue;
            } else {
                usableHeight -= gripperValue;
            }
        }

        // Passermarken (rundum)
        usableWidth -= 2 * passer;
        usableHeight -= 2 * passer;

        // Reset rows visibility and highlight
        ["h", "v"].forEach(ori => {
            const row = document.getElementById("pieces-" + index + "-" + ori).parentElement;
            row.style.display = "table-row";
            row.classList.remove("recommendation");
        });

        if (usableWidth <= 0 || usableHeight <= 0) {
            ORIENTATIONS.forEach((ori) => {
                const piecesCell = document.getElementById("pieces-" + index + "-" + ori);
                const layoutCell = document.getElementById("layout-" + index + "-" + ori);
                const effCell = document.getElementById("efficiency-" + index + "-" + ori);

                piecesCell.textContent = "Zu viel Rand, kein Platz";
                piecesCell.className = "muted";
                layoutCell.textContent = "–";
                effCell.textContent = "–";
            });
            return;
        }

        const productArea = productWidth * productHeight;
        const sheetArea = usableWidth * usableHeight;

        // Calculate metrics for both orientations
        function calcOrientation(ori, uW, uH) {
            const pW = ori === "h" ? productWidth : productHeight;
            const pH = ori === "h" ? productHeight : productWidth;

            const countX = Math.floor(uW / pW);
            const countY = Math.floor(uH / pH);
            const pieces = Math.max(countX, 0) * Math.max(countY, 0);
            const usedArea = pieces * productArea;
            const efficiency = pieces > 0 ? (usedArea / sheetArea) * 100 : 0;

            return { pieces, efficiency, countX, countY };
        }

        const resH = calcOrientation("h", usableWidth, usableHeight);
        const resV = calcOrientation("v", usableWidth, usableHeight);

        // Update DOM H
        const piecesCellH = document.getElementById("pieces-" + index + "-h");
        const layoutCellH = document.getElementById("layout-" + index + "-h");
        const effCellH = document.getElementById("efficiency-" + index + "-h");
        const rowH = piecesCellH.parentElement;

        if (resH.pieces === 0) {
            piecesCellH.textContent = "Passt nicht auf den Bogen";
            piecesCellH.className = "muted";
            layoutCellH.textContent = "–";
            effCellH.textContent = "–";
        } else {
            piecesCellH.textContent = getPiecesText(resH.pieces);
            piecesCellH.className = "";
            layoutCellH.textContent = resH.countX + " nebeneinander × " + resH.countY + " Reihen";
            effCellH.textContent = formatPercent(resH.efficiency);
            results.push({ row: rowH, pieces: resH.pieces, efficiency: resH.efficiency });
        }

        // Update DOM V
        const piecesCellV = document.getElementById("pieces-" + index + "-v");
        const layoutCellV = document.getElementById("layout-" + index + "-v");
        const effCellV = document.getElementById("efficiency-" + index + "-v");
        const rowV = piecesCellV.parentElement;

        if (resV.pieces === 0) {
            piecesCellV.textContent = "Passt nicht auf den Bogen";
            piecesCellV.className = "muted";
            layoutCellV.textContent = "–";
            effCellV.textContent = "–";
        } else {
            piecesCellV.textContent = getPiecesText(resV.pieces);
            piecesCellV.className = "";
            layoutCellV.textContent = resV.countX + " nebeneinander × " + resV.countY + " Reihen";
            effCellV.textContent = formatPercent(resV.efficiency);

            // Check duplicate: if V is identical to H, hide V
            // Identical means same pieces AND same efficiency
            if (resH.pieces > 0 && resV.pieces === resH.pieces && Math.abs(resV.efficiency - resH.efficiency) < 0.01) {
                rowV.style.display = "none";
            } else {
                results.push({ row: rowV, pieces: resV.pieces, efficiency: resV.efficiency });
            }
        }
    });

    // Highlight best option
    if (results.length > 0) {
        // Sort by pieces desc, then efficiency desc
        results.sort((a, b) => {
            if (b.pieces !== a.pieces) return b.pieces - a.pieces;
            return b.efficiency - a.efficiency;
        });

        const best = results[0];
        if (best.pieces > 0) {
            // Highlight all that match the best score and efficiency
            results.forEach(res => {
                if (res.pieces === best.pieces && Math.abs(res.efficiency - best.efficiency) < 0.01) {
                    res.row.classList.add("recommendation");
                }
            });
        }
    }
}

function onRowClick(event) {
    const tr = event.currentTarget;
    const formatIndex = parseInt(tr.dataset.formatIndex, 10);
    const orientation = tr.dataset.orientation;

    const wInput = document.getElementById("productWidth");
    const hInput = document.getElementById("productHeight");
    const passerInput = document.getElementById("passer");
    const gripperValueInput = document.getElementById("gripperValue");
    const gripperSideSelect = document.getElementById("gripperSide");
    const errorEl = document.getElementById("error");

    const wValue = wInput.value.replace(",", ".");
    const hValue = hInput.value.replace(",", ".");
    const passerValueRaw = passerInput.value.replace(",", ".");
    const gripperValueRaw = gripperValueInput.value.replace(",", ".");

    const productWidth = parseFloat(wValue);
    const productHeight = parseFloat(hValue);
    let passer = parseFloat(passerValueRaw);
    let gripperValue = parseFloat(gripperValueRaw);
    const gripperSide = gripperSideSelect.value;

    if (isNaN(productWidth) || productWidth <= 0 || isNaN(productHeight) || productHeight <= 0) {
        errorEl.textContent = "Für die Vorschau zuerst gültige Produktmaße eingeben.";
        return;
    }

    if (isNaN(passer) || passer < 0) passer = 0;
    if (isNaN(gripperValue) || gripperValue < 0) gripperValue = 0;

    const fmt = sheetFormats[formatIndex];
    const sheetWidth = fmt.width;
    const sheetHeight = fmt.height;

    let usableWidth = sheetWidth;
    let usableHeight = sheetHeight;

    if (gripperValue > 0 && gripperSide !== "none") {
        if (gripperSide === "links" || gripperSide === "rechts") {
            usableWidth -= gripperValue;
        } else {
            usableHeight -= gripperValue;
        }
    }

    usableWidth -= 2 * passer;
    usableHeight -= 2 * passer;

    if (usableWidth <= 0 || usableHeight <= 0) {
        errorEl.textContent = "Mit den aktuellen Rand-Einstellungen bleibt keine nutzbare Fläche für dieses Format.";
        return;
    }

    const orientationLabel = orientation === "h" ? "horizontal (nicht gedreht)" : "vertikal (gedreht)";
    const title = fmt.name + " – " + orientationLabel;
    showPreview(fmt, orientation, sheetWidth, sheetHeight, usableWidth, usableHeight,
        productWidth, productHeight, passer, gripperValue, gripperSide, title);
}

function showPreview(fmt, orientation, sheetWidth, sheetHeight, usableWidth, usableHeight,
    productWidth, productHeight, passer, gripperValue, gripperSide, title) {
    const overlay = document.getElementById("previewOverlay");
    const titleEl = document.getElementById("previewTitle");
    const svg = document.getElementById("previewSvg");

    titleEl.textContent = title;

    // Remove existing details if any
    const existingDetails = document.getElementById("previewDetails");
    if (existingDetails) {
        existingDetails.remove();
    }

    while (svg.firstChild) {
        svg.removeChild(svg.firstChild);
    }

    const viewW = 400;
    const viewH = 300;

    const scaleBase = Math.min((viewW - 40) / sheetWidth, (viewH - 40) / sheetHeight);
    const sheetWpx = sheetWidth * scaleBase;
    const sheetHpx = sheetHeight * scaleBase;
    const sheetX = (viewW - sheetWpx) / 2;
    const sheetY = (viewH - sheetHpx) / 2;

    svg.setAttribute("viewBox", `0 0 ${viewW} ${viewH}`);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "auto");

    const sheetRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    sheetRect.setAttribute("x", sheetX);
    sheetRect.setAttribute("y", sheetY);
    sheetRect.setAttribute("width", sheetWpx);
    sheetRect.setAttribute("height", sheetHpx);
    sheetRect.setAttribute("fill", "#dbeafe");
    sheetRect.setAttribute("stroke", "#1d4ed8");
    sheetRect.setAttribute("stroke-width", "1.5");
    svg.appendChild(sheetRect);

    if (gripperValue > 0 && gripperSide !== "none") {
        const gripperPx = gripperValue * scaleBase;
        const gripperRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        if (gripperSide === "oben") {
            gripperRect.setAttribute("x", sheetX);
            gripperRect.setAttribute("y", sheetY);
            gripperRect.setAttribute("width", sheetWpx);
            gripperRect.setAttribute("height", gripperPx);
        } else if (gripperSide === "unten") {
            gripperRect.setAttribute("x", sheetX);
            gripperRect.setAttribute("y", sheetY + sheetHpx - gripperPx);
            gripperRect.setAttribute("width", sheetWpx);
            gripperRect.setAttribute("height", gripperPx);
        } else if (gripperSide === "links") {
            gripperRect.setAttribute("x", sheetX);
            gripperRect.setAttribute("y", sheetY);
            gripperRect.setAttribute("width", gripperPx);
            gripperRect.setAttribute("height", sheetHpx);
        } else if (gripperSide === "rechts") {
            gripperRect.setAttribute("x", sheetX + sheetWpx - gripperPx);
            gripperRect.setAttribute("y", sheetY);
            gripperRect.setAttribute("width", gripperPx);
            gripperRect.setAttribute("height", sheetHpx);
        }
        gripperRect.setAttribute("fill", "#fecaca");
        gripperRect.setAttribute("stroke", "#b91c1c");
        gripperRect.setAttribute("stroke-width", "1");
        gripperRect.setAttribute("fill-opacity", "0.7");
        svg.appendChild(gripperRect);
    }

    let usableX = sheetX;
    let usableY = sheetY;
    let usableWpx = sheetWpx;
    let usableHpx = sheetHpx;

    if (gripperValue > 0 && gripperSide !== "none") {
        const gripperPx = gripperValue * scaleBase;
        if (gripperSide === "oben") {
            usableY += gripperPx;
            usableHpx -= gripperPx;
        } else if (gripperSide === "unten") {
            usableHpx -= gripperPx;
        } else if (gripperSide === "links") {
            usableX += gripperPx;
            usableWpx -= gripperPx;
        } else if (gripperSide === "rechts") {
            usableWpx -= gripperPx;
        }
    }

    const passerPx = passer * scaleBase;
    usableX += passerPx;
    usableY += passerPx;
    usableWpx -= 2 * passerPx;
    usableHpx -= 2 * passerPx;

    if (usableWpx > 0 && usableHpx > 0) {
        const usableRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        usableRect.setAttribute("x", usableX);
        usableRect.setAttribute("y", usableY);
        usableRect.setAttribute("width", usableWpx);
        usableRect.setAttribute("height", usableHpx);
        usableRect.setAttribute("fill", "#e5e7eb");
        usableRect.setAttribute("stroke", "#6b7280");
        usableRect.setAttribute("stroke-dasharray", "4 3");
        usableRect.setAttribute("stroke-width", "1");
        svg.appendChild(usableRect);
    }

    const prodWmm = orientation === "h" ? productWidth : productHeight;
    const prodHmm = orientation === "h" ? productHeight : productWidth;
    const prodWpx = prodWmm * scaleBase;
    const prodHpx = prodHmm * scaleBase;

    const countX = Math.floor(usableWpx / prodWpx);
    const countY = Math.floor(usableHpx / prodHpx);

    for (let ix = 0; ix < countX; ix++) {
        for (let iy = 0; iy < countY; iy++) {
            const x = usableX + ix * prodWpx;
            const y = usableY + iy * prodHpx;
            const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            r.setAttribute("x", x + 0.5);
            r.setAttribute("y", y + 0.5);
            r.setAttribute("width", prodWpx - 1);
            r.setAttribute("height", prodHpx - 1);
            r.setAttribute("fill", "#1d4ed8");
            r.setAttribute("fill-opacity", "0.6");
            r.setAttribute("stroke", "#1e3a8a");
            r.setAttribute("stroke-width", "0.5");
            svg.appendChild(r);
        }
    }

    // Calculate details for Mobile View (or general view)
    const pieces = Math.max(countX, 0) * Math.max(countY, 0);
    const prodArea = productWidth * productHeight;
    const sheetArea = usableWidth * usableHeight; // This uses usable dimensions. Usually efficiency is based on SHEET dimensions, let's consistency check.
    // In recalc: const sheetArea = usableWidth * usableHeight; -> Wait, recalc uses usableWidth * usableHeight for efficiency?
    // Let's check recalc... 
    // const sheetArea = usableWidth * usableHeight; 
    // Yes, code below line 158 in recalc: const sheetArea = usableWidth * usableHeight;
    // So efficiency is based on USABLE area.

    // Wait, typically efficiency is based on TOTAL sheet area.
    // Let's check recalc again. Line 158: const sheetArea = usableWidth * usableHeight;
    // Line 169: const efficiency = pieces > 0 ? (usedArea / sheetArea) * 100 : 0;
    // So current logic is based on USABLE area. I will stick to that to be consistent, although it might be "wrong" in print industry (usually total sheet). 
    // But I am just refactoring/optimizing, not changing business logic unless asked.

    // Actually, looking at recalc line 158:
    // const sheetArea = usableWidth * usableHeight;
    // This seems to be the logic used.

    const usedArea = pieces * prodArea;
    const efficiency = pieces > 0 ? (usedArea / sheetArea) * 100 : 0;

    const layoutText = `${countX} nebeneinander × ${countY} Reihen`;
    const effText = formatPercent(efficiency);
    const piecesText = `${pieces} Nutzen`;

    // Create details element
    const detailsDiv = document.createElement("div");
    detailsDiv.id = "previewDetails";
    detailsDiv.style.marginTop = "15px";
    detailsDiv.style.textAlign = "center";
    detailsDiv.style.fontSize = "0.9rem";
    detailsDiv.style.color = "var(--text-main)";
    detailsDiv.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 4px;">${piecesText}</div>
        <div style="color: var(--text-muted);">${layoutText}</div>
        <div style="margin-top: 4px;">Flächenausnutzung: <strong>${effText}</strong></div>
    `;

    // Insert after SVG wrapper
    const svgWrapper = svg.parentElement; // svg is inside .preview-svg-wrapper? No, svg is inside .preview-content directly?
    // Let's check HTML. 
    // <div class="preview-svg-wrapper"><svg id="previewSvg" ...></svg></div>
    // So svg.parentElement is wrapper.
    // We want to append to .preview-content, which is wrapper.parentElement.

    // Wait, I don't see the HTML structure in the file view for showPreview.
    // Let's look at `view_file` output around line 305.
    // const overlay = document.getElementById("previewOverlay");
    // const titleEl = document.getElementById("previewTitle");
    // const svg = document.getElementById("previewSvg");
    // It doesn't show the parent structure.

    // However, I can append to the container of the svg.
    svg.parentElement.insertAdjacentElement('afterend', detailsDiv);

    overlay.style.display = "flex";
}

document.addEventListener("DOMContentLoaded", () => {
    // Load custom formats from LocalStorage
    const storedFormats = localStorage.getItem("customFormats");
    if (storedFormats) {
        try {
            const parsedFormats = JSON.parse(storedFormats);
            parsedFormats.forEach(fmt => sheetFormats.push(fmt));
        } catch (e) {
            console.error("Fehler beim Laden der eigenen Formate", e);
        }
    }

    createInitialRows();
    document.getElementById("productWidth").addEventListener("input", recalc);
    document.getElementById("productHeight").addEventListener("input", recalc);
    document.getElementById("productionQuantity").addEventListener("input", recalc);
    document.getElementById("passer").addEventListener("input", recalc);
    document.getElementById("gripperValue").addEventListener("input", recalc);
    document.getElementById("gripperSide").addEventListener("change", recalc);

    document.getElementById("addFormatBtn").addEventListener("click", () => {
        const wInput = document.getElementById("customWidth");
        const hInput = document.getElementById("customHeight");
        const wValRaw = parseFloat(wInput.value.replace(",", "."));
        const hValRaw = parseFloat(hInput.value.replace(",", "."));
        const errorEl = document.getElementById("error");

        if (isNaN(wValRaw) || wValRaw <= 0 || isNaN(hValRaw) || hValRaw <= 0) {
            errorEl.textContent = "Bitte gültige Breite und Höhe für das eigene Format eingeben.";
            return;
        }

        // Clear separate error if any
        if (errorEl.textContent.includes("Bitte gültige Breite")) {
            errorEl.textContent = "";
        }

        const wVal = Math.max(wValRaw, hValRaw);
        const hVal = Math.min(wValRaw, hValRaw);

        const newFormat = {
            name: Math.round(wVal) + " × " + Math.round(hVal) + " mm (Eigenes)",
            width: wVal,
            height: hVal
        };

        sheetFormats.push(newFormat);

        // Save to LocalStorage
        try {
            const currentCustoms = localStorage.getItem("customFormats");
            let customsArr = currentCustoms ? JSON.parse(currentCustoms) : [];
            customsArr.push(newFormat);
            localStorage.setItem("customFormats", JSON.stringify(customsArr));
        } catch (e) {
            console.error("Fehler beim Speichern des Formats", e);
        }

        wInput.value = "";
        hInput.value = "";

        createInitialRows();
        recalc();
    });

    const overlay = document.getElementById("previewOverlay");
    const closeBtn = document.getElementById("previewClose");

    closeBtn.addEventListener("click", () => {
        overlay.style.display = "none";
    });

    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
            overlay.style.display = "none";
        }
    });

    // Browser Dimensions Display
    const dimsDisplay = document.getElementById("dimensionsDisplay");
    function updateDimensions() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        dimsDisplay.textContent = w + " × " + h;
    }
    window.addEventListener("resize", updateDimensions);
    updateDimensions(); // Initial call
});

// Dark Mode Logic
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

// Check local storage
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "dark") {
    updateTheme(true);
}

themeToggleBtn.addEventListener("click", () => {
    const isDark = document.body.classList.contains("dark-mode");
    if (isDark) {
        updateTheme(false);
        localStorage.setItem("theme", "light");
    } else {
        updateTheme(true);
        localStorage.setItem("theme", "dark");
    }
});
