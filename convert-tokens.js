const fs = require('fs');
const path = require('path');

// File paths
const COLOR_TOKENS_PATH = path.join(__dirname, 'colour-token.json');
const TYPO_TOKENS_PATH = path.join(__dirname, 'design-tokens.tokens.json');
const OUTPUT_CSS_PATH = path.join(__dirname, 'variables.css');

// Fallback palettes for missing tokens in input JSON
const FALLBACK_PALETTES = {
  'color.palette.error': {
    "0": "hsl(0, 0%, 0%)",
    "10": "hsl(354, 100%, 12%)",
    "20": "hsl(354, 100%, 22%)",
    "30": "hsl(354, 100%, 32%)",
    "40": "hsl(354, 70%, 42%)",
    "50": "hsl(354, 70%, 52%)",
    "60": "hsl(354, 80%, 62%)",
    "70": "hsl(354, 90%, 72%)",
    "80": "hsl(354, 100%, 82%)",
    "90": "hsl(354, 100%, 90%)",
    "92": "hsl(354, 100%, 92%)",
    "94": "hsl(354, 100%, 94%)",
    "95": "hsl(354, 100%, 95%)",
    "96": "hsl(354, 100%, 96%)",
    "98": "hsl(354, 100%, 98%)",
    "99": "hsl(354, 100%, 99%)",
    "100": "hsl(0, 0%, 100%)"
  },
  'color.palette.neutral': {
    "4": "hsl(288, 9%, 4%)",
    "6": "hsl(288, 9%, 6%)",
    "10": "hsl(288, 9%, 10%)",
    "12": "hsl(288, 9%, 12%)",
    "17": "hsl(288, 9%, 17%)",
    "22": "hsl(300, 5%, 22%)",
    "24": "hsl(300, 5%, 24%)"
  }
};

/**
 * Resolves references like "{color.palette.primary.100}" in the color tokens JSON
 */
function resolveColor(value, colorData) {
  if (typeof value !== 'string') return value;
  
  const match = value.match(/^\{([^}]+)\}$/);
  if (!match) return value;
  
  const refPath = match[1];
  const parts = refPath.split('.');
  
  // Try to resolve in the current JSON data
  let current = colorData;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      current = null;
      break;
    }
  }
  
  // If found, recursively resolve in case it points to another reference
  if (current !== null && current !== undefined) {
    return resolveColor(current, colorData);
  }
  
  // Try resolving using defined fallback palettes
  for (const [prefix, fallbackMap] of Object.entries(FALLBACK_PALETTES)) {
    if (refPath.startsWith(prefix + '.')) {
      const level = refPath.slice(prefix.length + 1);
      if (fallbackMap[level]) {
        return fallbackMap[level];
      }
    }
  }
  
  // Fallback for key error
  if (refPath === 'color.key.error') {
    return 'hsl(354, 70%, 42%)';
  }
  
  console.warn(`Warning: Could not resolve reference "${value}"`);
  return value;
}

/**
 * Helper to convert camelCase or spaces into kebab-case
 */
function toKebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2') // camelCase to kebab-case
    .replace(/\s+/g, '-')                // spaces to hyphens
    .replace(/-+/g, '-')                 // clean extra hyphens
    .toLowerCase();
}

/**
 * Formats values based on property type (e.g. appends px to numeric dimensions)
 */
function formatTypographyValue(propName, value) {
  if (typeof value === 'number') {
    const pxProps = ['font-size', 'letter-spacing', 'line-height', 'paragraph-indent', 'paragraph-spacing'];
    if (pxProps.includes(propName)) {
      return `${value}px`;
    }
  }
  
  if (propName === 'font-family' && typeof value === 'string') {
    // Quote font family if it has spaces and isn't already quoted
    if (value.includes(' ') && !value.startsWith("'") && !value.startsWith('"')) {
      return `'${value}'`;
    }
  }
  
  return value;
}

function generateCSS() {
  console.log('Reading token files...');
  
  // 1. Parse Color Tokens
  let colorData;
  try {
    const colorContent = fs.readFileSync(COLOR_TOKENS_PATH, 'utf8');
    colorData = JSON.parse(colorContent);
  } catch (err) {
    console.error(`Error reading ${COLOR_TOKENS_PATH}:`, err.message);
    process.exit(1);
  }
  
  // 2. Parse Typography Tokens
  let typoData;
  try {
    const typoContent = fs.readFileSync(TYPO_TOKENS_PATH, 'utf8');
    typoData = JSON.parse(typoContent);
  } catch (err) {
    console.error(`Error reading ${TYPO_TOKENS_PATH}:`, err.message);
    process.exit(1);
  }

  const cssLines = [];
  cssLines.push('/* ========================================== */');
  cssLines.push('/* DESIGN SYSTEM CSS VARIABLES                */');
  cssLines.push('/* Generated automatically from JSON tokens.  */');
  cssLines.push('/* ========================================== */');
  cssLines.push('');

  // 3. Process Typography Variables (put under :root as global styles)
  cssLines.push(':root {');
  cssLines.push('  /* ========================================== */');
  cssLines.push('  /* TYPOGRAPHY VARIABLES                       */');
  cssLines.push('  /* ========================================== */');
  
  const typographySection = typoData.typography || {};
  for (const [styleName, styleProps] of Object.entries(typographySection)) {
    cssLines.push(`  /* --- Typography: ${styleName} --- */`);
    
    // We sort keys to output consistently
    const sortedProps = Object.keys(styleProps).sort();
    
    for (const propName of sortedProps) {
      const propObj = styleProps[propName];
      // Expecting { type: '...', value: '...' }
      if (propObj && propObj.value !== undefined) {
        const kebabStyle = toKebabCase(styleName);
        let kebabProp = toKebabCase(propName);
        
        // Map Figma textCase to standard CSS text-transform
        if (kebabProp === 'text-case') {
          kebabProp = 'text-transform';
        }
        
        const formattedVal = formatTypographyValue(kebabProp, propObj.value);
        cssLines.push(`  --font-${kebabStyle}-${kebabProp}: ${formattedVal};`);
      }
    }
    cssLines.push('');
  }

  // 4. Process Light Theme Color Roles (default theme, inside :root)
  cssLines.push('  /* ========================================== */');
  cssLines.push('  /* COLOR ROLES - LIGHT THEME (DEFAULT)        */');
  cssLines.push('  /* ========================================== */');
  
  const lightRoles = colorData.color?.role?.light || {};
  for (const [roleName, refVal] of Object.entries(lightRoles)) {
    const resolvedVal = resolveColor(refVal, colorData);
    const kebabRole = toKebabCase(roleName);
    cssLines.push(`  --color-${kebabRole}: ${resolvedVal};`);
  }
  cssLines.push('}');
  cssLines.push('');

  // 5. Process Dark Theme Color Roles (under prefers-color-scheme)
  cssLines.push('/* ========================================== */');
  cssLines.push('/* COLOR ROLES - DARK THEME (SYSTEM PREF)     */');
  cssLines.push('/* ========================================== */');
  cssLines.push('@media (prefers-color-scheme: dark) {');
  cssLines.push('  :root {');
  
  const darkRoles = colorData.color?.role?.dark || {};
  for (const [roleName, refVal] of Object.entries(darkRoles)) {
    const resolvedVal = resolveColor(refVal, colorData);
    const kebabRole = toKebabCase(roleName);
    cssLines.push(`    --color-${kebabRole}: ${resolvedVal};`);
  }
  cssLines.push('  }');
  cssLines.push('}');
  cssLines.push('');

  // 6. Process Dark Theme Color Roles (under data-theme / class override)
  cssLines.push('/* ========================================== */');
  cssLines.push('/* COLOR ROLES - DARK THEME (MANUAL OVERRIDE) */');
  cssLines.push('/* ========================================== */');
  cssLines.push('[data-theme="dark"], .dark-theme {');
  for (const [roleName, refVal] of Object.entries(darkRoles)) {
    const resolvedVal = resolveColor(refVal, colorData);
    const kebabRole = toKebabCase(roleName);
    cssLines.push(`  --color-${kebabRole}: ${resolvedVal};`);
  }
  cssLines.push('}');
  cssLines.push('');

  // Write to variables.css
  fs.writeFileSync(OUTPUT_CSS_PATH, cssLines.join('\n'));
  console.log(`Successfully generated CSS variables file at: ${OUTPUT_CSS_PATH}`);
}

generateCSS();
