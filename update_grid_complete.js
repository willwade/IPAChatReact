const fs = require('fs');

// Complete phoneme order from example2, skipping the ones already placed
const phonemeOrder = [
  // Skip: "æ", "e", "ɪ", "ɒ", "ʊ", "ə", "i", "ɐ", "ʌ" (already placed)
  "ˈ", "ˌ", // Continue from position (10,1), (11,1)
  "ɑː", "ɜː", "iː", "ɔː", "uː", "↘", "↗", "↑", "↓", "|", "‖", // Row 2: (0,2) to (11,2)
  "eɪ", "aɪ", "ɔɪ", "əʊ", "aʊ", "ɪə", "eə", "ʊə", "m", "n", "ŋ", "ʃ", // Row 3: (0,3) to (11,3)
  "ʒ", "θ", "ð", "s", "z", "f", "v", "h", "tʃ", "dʒ", "p", "b", // Row 4: (0,4) to (11,4)
  "t", "d", "k", "g", "ɹ", "j", "w", "l" // Row 5: (0,5) to (7,5)
];

// Positions for remaining cells, skipping already filled ones
const positions = [
  // Row 1 remaining
  [10, 1], [11, 1],
  // Row 2 all positions (cells without X attribute start at X=0)
  [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2],
  // Row 3 all positions  
  [0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],
  // Row 4 all positions
  [0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4],
  // Row 5 positions 0-7 (8-11 stay empty for now)
  [0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5]
];

// Read the current grid file
let gridXml = fs.readFileSync('IPA - Copy/Grids/Start/grid.xml', 'utf8');

// Process each phoneme
positions.forEach(([x, y], index) => {
  if (index >= phonemeOrder.length) return;
  
  const phoneme = phonemeOrder[index];
  
  // Handle cells at X=0 (they don't have X attribute in XML)
  let oldPattern, newPattern;
  
  if (x === 0) {
    oldPattern = `<Cell Y="${y}">
      <Content>
        <Style>
          <BasedOnStyle>Default</BasedOnStyle>
        </Style>
      </Content>
    </Cell>`;
    
    newPattern = `<Cell Y="${y}">
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
  } else {
    oldPattern = `<Cell X="${x}" Y="${y}">
      <Content>
        <Style>
          <BasedOnStyle>Default</BasedOnStyle>
        </Style>
      </Content>
    </Cell>`;
    
    newPattern = `<Cell X="${x}" Y="${y}">
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
  }

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
console.log('Complete grid update finished!');