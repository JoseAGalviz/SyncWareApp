const fs = require('fs');
const path = require('path');

const directoryPaths = [
    'C:\\Users\\iprog\\Projects\\SyncWareApp\\src\\screens',
    'C:\\Users\\iprog\\Projects\\SyncWareApp\\src\\navigation'
];

const colorMap = {
    // Primary
    "'#007a5e'": "COLORS.PRIMARY",
    '"#007a5e"': "COLORS.PRIMARY",
    "'#1A9888'": "COLORS.PRIMARY",
    '"#1A9888"': "COLORS.PRIMARY",
    "'#0F766E'": "COLORS.PRIMARY",
    '"#0F766E"': "COLORS.PRIMARY",

    // Success
    "'#49AF4E'": "COLORS.SUCCESS",
    '"#49AF4E"': "COLORS.SUCCESS",
    "'#10B981'": "COLORS.SUCCESS",
    '"#10B981"': "COLORS.SUCCESS",
    "'#166534'": "COLORS.SUCCESS",

    // Secondary/Dark
    "'#1E293B'": "COLORS.SECONDARY",
    '"#1E293B"': "COLORS.SECONDARY",
    "'#333333'": "COLORS.SECONDARY",
    '"#333333"': "COLORS.SECONDARY",
    "'#333'": "COLORS.SECONDARY",
    '"#333"': "COLORS.SECONDARY",
    "'#222'": "COLORS.SECONDARY",
    '"#222"': "COLORS.SECONDARY",

    // Muted/Text
    "'#64748B'": "COLORS.MUTED",
    '"#64748B"': "COLORS.MUTED",
    "'#888'": "COLORS.MUTED",
    '"#888"': "COLORS.MUTED",
    "'#888888'": "COLORS.MUTED",
    '"#888888"': "COLORS.MUTED",
    "'#94a3b8'": "COLORS.MUTED",
    '"#94a3b8"': "COLORS.MUTED",

    // Border
    "'#cbd5e1'": "COLORS.BORDER",
    '"#cbd5e1"': "COLORS.BORDER",
    "'#e2e8f0'": "COLORS.BORDER",
    '"#e2e8f0"': "COLORS.BORDER",
    "'#ddd'": "COLORS.BORDER",
    '"#ddd"': "COLORS.BORDER",

    // Background
    "'#F1F5F9'": "COLORS.BACKGROUND",
    '"#F1F5F9"': "COLORS.BACKGROUND",
    "'#f8f8f8'": "COLORS.LIGHT_BG",
    '"#f8f8f8"': "COLORS.LIGHT_BG",
    "'#f7f9fa'": "COLORS.LIGHT_BG",
    '"#f7f9fa"': "COLORS.LIGHT_BG",

    // White
    "'#FFFFFF'": "COLORS.WHITE",
    '"#FFFFFF"': "COLORS.WHITE",
    "'#fff'": "COLORS.WHITE",
    '"#fff"': "COLORS.WHITE",
    "'#ffffff'": "COLORS.WHITE",
    '"#ffffff"': "COLORS.WHITE",

    // Warning/Error
    "'#EF4444'": "COLORS.ERROR",
    '"#EF4444"': "COLORS.ERROR",
    "'#d9534f'": "COLORS.ERROR",
    '"#d9534f"': "COLORS.ERROR",
    "'#f59e0b'": "COLORS.WARNING",
    '"#f59e0b"': "COLORS.WARNING",
    "'#FFD600'": "COLORS.WARNING",
    '"#FFD600"': "COLORS.WARNING",

    // Info
    "'#007bff'": "COLORS.INFO",
    '"#007bff"': "COLORS.INFO",
    "'#3B82F6'": "COLORS.ACCENT",
    '"#3B82F6"': "COLORS.ACCENT",
};

// Exclude these files as they were already correctly refactored
const excludeFiles = ['HomeScreen.js', 'GuiaCargaScreen.js', 'CargarRutaScreen.js', 'LoginScreen.js', 'MatrixExcelScreen.js'];

function replaceColorsInFile(filePath) {
    const fileName = path.basename(filePath);
    if (excludeFiles.includes(fileName)) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    for (const [key, value] of Object.entries(colorMap)) {
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedKey, 'g'); // removed 'i' flag so it replaces case matched colors, but this could be fine to leave out.
        content = content.replace(regex, value);
    }

    if (content !== originalContent) {
        if (!content.includes("import COLORS from")) {
            const depth = filePath.split(path.sep).length - 'C:\\Users\\iprog\\Projects\\SyncWareApp\\src'.split(path.sep).length;
            let relativePath = depth === 2 ? '../constants/Colors' : '../../constants/Colors';

            const importStatement = `import COLORS from '${relativePath}';\n`;
            const lines = content.split('\n');
            let lastImportIndex = -1;

            for (let i = 0; i < lines.length; i++) {
                if (lines[i].startsWith('import ')) {
                    lastImportIndex = i;
                }
            }

            if (lastImportIndex !== -1) {
                lines.splice(lastImportIndex + 1, 0, importStatement);
            } else {
                lines.unshift(importStatement);
            }

            content = lines.join('\n');
        }
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
    }
}

directoryPaths.forEach(dirPath => {
    if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        files.forEach(file => {
            if (file.endsWith('.js') || file.endsWith('.jsx')) {
                replaceColorsInFile(path.join(dirPath, file));
            }
        });
    }
});

console.log('Done replacing colors!');
