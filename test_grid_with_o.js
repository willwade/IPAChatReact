const fs = require('fs');

// Read the current grid file
let gridXml = fs.readFileSync('IPA - Copy/Grids/Start/grid.xml', 'utf8');

// Replace all phoneme symbols with "o" in both <r> tags and <Caption> tags
// This will test if the structure works without potentially problematic IPA symbols

gridXml = gridXml.replace(/<r>[^<]+<\/r>/g, '<r>o</r>');
gridXml = gridXml.replace(/<Caption>[^<]+<\/Caption>/g, '<Caption>o</Caption>');

// But preserve the original non-phoneme captions
gridXml = gridXml.replace(/<Caption>o<\/Caption>([^]*?)<Image>/g, function(match, content) {
  if (content.includes('Home') || content.includes('Load') || content.includes('Enter')) {
    return match.replace('<Caption>o</Caption>', '<Caption>' + content.match(/<Caption>([^<]+)<\/Caption>/)[1] + '</Caption>');
  }
  return match;
});

// Fix the specific system buttons
gridXml = gridXml.replace(/<Caption>o<\/Caption>\s*<Image>\[GRID3X\]jump_home\.wmf<\/Image>/, '<Caption>Home</Caption>\n          <Image>[GRID3X]jump_home.wmf</Image>');
gridXml = gridXml.replace(/<Caption>o<\/Caption>\s*<Image>\[grid3x\]loading_dots\.wmf<\/Image>/, '<Caption>Load</Caption>\n          <Image>[grid3x]loading_dots.wmf</Image>');  
gridXml = gridXml.replace(/<Caption>o<\/Caption>\s*<Image>\[GRID3X\]enter\.wmf<\/Image>/, '<Caption>Enter</Caption>\n          <Image>[GRID3X]enter.wmf</Image>');

// Write the test grid file
fs.writeFileSync('IPA - Copy/Grids/Start/grid.xml', gridXml);
console.log('Replaced all phoneme symbols with "o" for testing!');