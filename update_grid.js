const fs = require('fs');

// Phoneme order from example2
const phonemeOrder = [
  "æ", "e", "ɪ", "ɒ", "ʊ", "ə", "i", "ɐ", "ʌ", "ˈ", "ˌ",
  "ɑː", "ɜː", "iː", "ɔː", "uː", "↘", "↗", "↑", "↓", "|", "‖",
  "eɪ", "aɪ", "ɔɪ", "əʊ", "aʊ", "ɪə", "eə", "ʊə",
  "m", "n", "ŋ", "ʃ", "ʒ", "θ", "ð", "s", "z", "f", "v", "h",
  "tʃ", "dʒ", "p", "b", "t", "d", "k", "g", "ɹ", "j", "w", "l"
];

// Grid positions (skipping occupied positions)
// Row 1: æ is at (0,1), e is at (1,1), ɪ is at (3,1)
// Starting with (4,1) and continuing...
const positions = [
  // Row 1 - continuing from position 4
  [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1],
  // Row 2 - all positions 0-11
  [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2],
  // Row 3 - all positions 0-11
  [0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],
  // Row 4 - all positions 0-11
  [0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4],
  // Row 5 - all positions 0-11
  [0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5]
];

// Read the current grid file
let gridXml = fs.readFileSync('IPA - Copy/Grids/Start/grid.xml', 'utf8');

// First, fix the duplicate 'e' at position (2,1) to be 'ɪ' (this is already done)

// Start from phoneme index 3 (ɒ) since æ, e, ɪ are already placed
let phonemeIndex = 3;

// Create phoneme cells for each position
positions.forEach(([x, y], posIndex) => {
  if (phonemeIndex >= phonemeOrder.length) return;
  
  const phoneme = phonemeOrder[phonemeIndex];
  const oldPattern = `<Cell X="${x}" Y="${y}">
      <Content>
        <Style>
          <BasedOnStyle>Default</BasedOnStyle>
        </Style>
      </Content>
    </Cell>`;
  
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

  gridXml = gridXml.replace(oldPattern, newPattern);
  phonemeIndex++;
});

// Handle the special case for position (0, 2), (0, 3), (0, 4), (0, 5) which don't have X="0"
positions.forEach(([x, y], posIndex) => {
  if (x !== 0) return; // Only handle X=0 positions
  if (phonemeIndex >= phonemeOrder.length) return;
  
  const phoneme = phonemeOrder[phonemeIndex - positions.length + posIndex];
  const oldPattern = `<Cell Y="${y}">
      <Content>
        <Style>
          <BasedOnStyle>Default</BasedOnStyle>
        </Style>
      </Content>
    </Cell>`;
  
  const newPattern = `<Cell Y="${y}">
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

  gridXml = gridXml.replace(oldPattern, newPattern);
});

// Write the updated grid file
fs.writeFileSync('IPA - Copy/Grids/Start/grid.xml', gridXml);
console.log('Grid updated successfully!');