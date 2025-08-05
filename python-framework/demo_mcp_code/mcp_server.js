
// Demo MCP Server Code mit Fehlern
const express = require('express');
const app = express();

function calculateTotal(items) {
    let total = 0;
    for (let item of items) {
        // Fehler: Null-Check fehlt
        total += item.price;
    }
    return total
} // Fehler: Fehlender Semicolon

function processData(data) {
    // Fehler: Typo - sollte "length" sein
    return data.lenght;
}

// Undefined function call
function main() {
    const items = [null, {price: 10}, {price: 20}];
    const total = calculateSum(items); // Fehler: calculateSum existiert nicht
    console.log('Total:', total);
}

app.get('/health', (req, res) => {
    res.json({status: 'ok'});
});

app.listen(3000, () => {
    console.log('MCP Server running on port 3000');
});
