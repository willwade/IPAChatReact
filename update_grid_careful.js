const fs = require('fs');

// Only the first few phonemes to test - we'll add more once this works
const phonemeOrder = [
  "ɒ", "ʊ", "ə", "i", "ɐ", "ʌ"  // Start with just 6 phonemes for testing
];

// Only fill the first row empty cells for now
const positions = [
  [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1]
];

// Read the current grid file
let gridXml = fs.readFileSync('IPA - Copy/Grids/Start/grid.xml', 'utf8');

// Process each phoneme one by one
positions.forEach(([x, y], index) => {
  if (index >= phonemeOrder.length) return;
  
  const phoneme = phonemeOrder[index];
  
  // Look for the exact empty cell pattern
  const oldPattern = `<Cell X="${x}" Y="${y}">
      <Content>
        <Style>
          <BasedOnStyle>Default</BasedOnStyle>
        </Style>
      </Content>
    </Cell>`;
  
  // Create the replacement with proper phoneme content
  const newPattern = `<Cell X="${x}" Y="${y}">
      <Content>
        <Commands>
          <Command ID="Action.InsertText">
            <Parameter Key="indicatorenabled">1</Parameter>
            <Parameter Key="text">
              <r>${phoneme}</r>
            </Parameter>
            <Parameter Key="showincelllabel">Yes</Parameter>
          </Command>
        </Commands>
        <CaptionAndImage>
          <Caption>${phoneme}</Caption>
        </CaptionAndImage>
        <Style>
          <BasedOnStyle>Vocab cell</BasedOnStyle>
        </Style>
      </Content>
    </Cell>`;

  // Replace only if found
  if (gridXml.includes(oldPattern)) {
    gridXml = gridXml.replace(oldPattern, newPattern);
    console.log(`✓ Updated cell (${x},${y}) with phoneme: ${phoneme}`);
  } else {
    console.log(`✗ Could not find empty cell at (${x},${y})`);
  }
});

// Write the updated grid file
fs.writeFileSync('IPA - Copy/Grids/Start/grid.xml', gridXml);
console.log('Grid update completed!');