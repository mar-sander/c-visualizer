const samples = {
  basic: `#include <stdio.h>\n\nint main(void){\n    int a = 3;\n    int b = 5;\n    int c = a + b;\n    printf("%d\\n", c);\n    return 0;\n}`,
  calcSimple: `#include <stdio.h>\n\nint main(void){\n    int price = 120;\n    int count = 3;\n    int total = price * count;\n    printf("%d円です\\n", total);\n    return 0;\n}`,
  calc: `#include <stdio.h>\n\nint main(void){\n    int price = 120;\n    int count = 4;\n    int total = price * count;\n    int change = 1000 - total;\n    printf("合計:%d円\\n", total);\n    printf("おつり:%d円\\n", change);\n    return 0;\n}`,
  assign: `#include <stdio.h>\n\nint main(void){\n    int score = 60;\n    score = score + 15;\n    printf("%d\\n", score);\n    return 0;\n}`,
  ifSimple: `#include <stdio.h>\n\nint main(void){\n    int score = 78;\n    if(score >= 60){\n        printf("合格です\\n");\n    }\n    return 0;\n}`,
  ifElse: `#include <stdio.h>\n\nint main(void){\n    int score = 45;\n    if(score >= 60){\n        printf("合格です\\n");\n    }else{\n        printf("もう一度挑戦\\n");\n    }\n    return 0;\n}`,
  nestedIf: `#include <stdio.h>\n\nint main(void){\n    int score = 85;\n\n    if(score >= 60){\n        printf("合格です\\n");\n\n        if(score >= 80){\n            printf("高得点です\\n");\n        }\n    }\n\n    return 0;\n}`,
  nestedIfElse: `#include <stdio.h>\n\nint main(void){\n    int score = 75;\n\n    if(score >= 60){\n        if(score >= 80){\n            printf("高得点です\\n");\n        }else{\n            printf("合格です\\n");\n        }\n    }\n\n    return 0;\n}`,
  scanfInput: `#include <stdio.h>\n\nint main(void){\n    int score;\n\n    scanf("%d", &score);\n\n    if(score >= 60){\n        printf("合格です\\n");\n    }else{\n        printf("不合格です\\n");\n    }\n\n    return 0;\n}`,
  unsupported: `#include <stdio.h>\n\nint main(void){\n    int count = 0;\n\n    while(count < 3){\n        count = count + 1;\n    }\n\n    return 0;\n}`
};

// scanfを使うサンプルだけ、コードと一緒に専用入力欄の値も準備します。
const sampleScanfInputs = {
  scanfInput: '75'
};

// 数値の 0 と区別して、まだ値が入っていない状態を表します。
const UNINITIALIZED = Symbol('uninitialized');

// ブラウザ停止を防ぐため、1つのfor文で本体へ入れる回数を制限します。
const MAX_FOR_ITERATIONS = 500;

function escapeHtml(str){
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 色だけでコードの役割を見分けやすくするための、軽量なC言語用ハイライトです。
// 解析機能とは独立しており、入力された文字列そのものは変更しません。
const C_SYNTAX_KEYWORDS = new Set([
  'break', 'case', 'const', 'continue', 'default', 'do', 'else', 'enum',
  'extern', 'for', 'goto', 'if', 'register', 'return', 'sizeof', 'static',
  'struct', 'switch', 'typedef', 'union', 'volatile', 'while'
]);

const C_SYNTAX_TYPES = new Set([
  'char', 'double', 'float', 'int', 'long', 'short', 'signed', 'unsigned', 'void'
]);

function syntaxSpan(className, text){
  return `<span class="${className}">${escapeHtml(text)}</span>`;
}

function isPreprocessorStart(code, index){
  const lineStart = code.lastIndexOf('\n', index - 1) + 1;
  return /^\s*$/.test(code.slice(lineStart, index));
}

function isIncludeHeaderStart(code, index){
  const lineStart = code.lastIndexOf('\n', index - 1) + 1;
  return /^\s*#\s*include\s*$/.test(code.slice(lineStart, index));
}

function highlightCCode(code){
  const source = String(code);
  let html = '';
  let index = 0;
  let inBlockComment = false;

  while(index < source.length){
    if(inBlockComment){
      const commentEnd = source.indexOf('*/', index);
      const end = commentEnd === -1 ? source.length : commentEnd + 2;
      html += syntaxSpan('syntax-comment', source.slice(index, end));
      index = end;
      inBlockComment = commentEnd === -1;
      continue;
    }

    if(source.startsWith('//', index)){
      const lineEnd = source.indexOf('\n', index);
      const end = lineEnd === -1 ? source.length : lineEnd;
      html += syntaxSpan('syntax-comment', source.slice(index, end));
      index = end;
      continue;
    }

    if(source.startsWith('/*', index)){
      const commentEnd = source.indexOf('*/', index + 2);
      const end = commentEnd === -1 ? source.length : commentEnd + 2;
      html += syntaxSpan('syntax-comment', source.slice(index, end));
      index = end;
      inBlockComment = commentEnd === -1;
      continue;
    }

    const character = source[index];

    if(character === '"' || character === "'"){
      const quote = character;
      let end = index + 1;
      let escaped = false;

      while(end < source.length){
        const current = source[end];
        end++;

        if(escaped){
          escaped = false;
          continue;
        }
        if(current === '\\'){
          escaped = true;
          continue;
        }
        if(current === quote) break;
      }

      html += syntaxSpan('syntax-string', source.slice(index, end));
      index = end;
      continue;
    }

    if(character === '#' && isPreprocessorStart(source, index)){
      const directiveMatch = source.slice(index).match(/^#\s*[A-Za-z_][A-Za-z0-9_]*/);
      const directive = directiveMatch ? directiveMatch[0] : '#';
      html += syntaxSpan('syntax-preprocessor', directive);
      index += directive.length;
      continue;
    }

    if(character === '<' && isIncludeHeaderStart(source, index)){
      const headerEnd = source.indexOf('>', index + 1);
      if(headerEnd !== -1){
        html += syntaxSpan('syntax-header', source.slice(index, headerEnd + 1));
        index = headerEnd + 1;
        continue;
      }
    }

    const identifierMatch = source.slice(index).match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if(identifierMatch){
      const identifier = identifierMatch[0];
      let className = '';

      if(C_SYNTAX_TYPES.has(identifier)){
        className = 'syntax-type';
      }else if(C_SYNTAX_KEYWORDS.has(identifier)){
        className = 'syntax-keyword';
      }else{
        const afterIdentifier = source.slice(index + identifier.length);
        if(/^\s*\(/.test(afterIdentifier)) className = 'syntax-function';
      }

      html += className ? syntaxSpan(className, identifier) : escapeHtml(identifier);
      index += identifier.length;
      continue;
    }

    const numberMatch = source.slice(index).match(/^(?:0[xX][0-9a-fA-F]+|0[bB][01]+|\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)(?:[uUlLfF]+)?/);
    if(numberMatch){
      html += syntaxSpan('syntax-number', numberMatch[0]);
      index += numberMatch[0].length;
      continue;
    }

    if(/[+\-*\/%=<>!&|^~?:]/.test(character)){
      html += syntaxSpan('syntax-operator', character);
      index++;
      continue;
    }

    html += escapeHtml(character);
    index++;
  }

  return html;
}

function syncCodeEditorScroll(){
  const input = document.getElementById('codeInput');
  const highlight = document.getElementById('codeHighlight');
  const lineNumbers = document.getElementById('codeLineNumbers');
  if(!input || !highlight || !lineNumbers) return;

  highlight.style.transform = `translate(${-input.scrollLeft}px, ${-input.scrollTop}px)`;
  lineNumbers.style.transform = `translateY(${-input.scrollTop}px)`;
}

function updateCodeEditor(){
  const input = document.getElementById('codeInput');
  const highlight = document.getElementById('codeHighlight');
  const lineNumbers = document.getElementById('codeLineNumbers');
  if(!input || !highlight || !lineNumbers) return;

  const code = input.value.replace(/\r\n/g, '\n');
  const lineCount = code.split('\n').length;
  highlight.innerHTML = highlightCCode(code);
  lineNumbers.textContent = Array.from({ length:lineCount }, (_, index) => index + 1).join('\n');
  syncCodeEditorScroll();
}

function initializeCodeEditor(){
  const input = document.getElementById('codeInput');
  const highlight = document.getElementById('codeHighlight');
  const lineNumbers = document.getElementById('codeLineNumbers');
  if(!input || !highlight || !lineNumbers) return;

  input.addEventListener('input', updateCodeEditor);
  input.addEventListener('scroll', syncCodeEditorScroll);
  updateCodeEditor();
}

function resetCode(){
  const codeInput = document.getElementById('codeInput');
  const scanfInput = document.getElementById('scanfInput');
  codeInput.value = '';
  codeInput.scrollTop = 0;
  codeInput.scrollLeft = 0;
  if(scanfInput) scanfInput.value = '';
  document.getElementById('outputResult').textContent = '';
  document.getElementById('variableState').innerHTML = '';
  document.getElementById('stepResult').innerHTML = '';
  document.getElementById('codePreview').innerHTML = '';
  document.getElementById('hintResult').innerHTML = '';
  updateCodeEditor();
}

function loadSample(type){
  const codeInput = document.getElementById('codeInput');
  const scanfInput = document.getElementById('scanfInput');
  codeInput.value = samples[type] || '';
  codeInput.scrollTop = 0;
  codeInput.scrollLeft = 0;
  if(scanfInput) scanfInput.value = sampleScanfInputs[type] || '';
  visualizeCode();
}

function addAnalysis(map, lineNo, text){
  if(!map[lineNo]) map[lineNo] = [];
  map[lineNo].push(text);
}

function addHint(list, lineNo, title, text){
  const prefix = lineNo ? `${lineNo}行目：` : '';
  list.push(`<div class="warning-line"><strong>${prefix}${title}</strong><br>${text}</div>`);
}

function shouldProbablyEndWithSemicolon(trimmed){
  if(trimmed === '') return false;
  if(trimmed.endsWith(';')) return false;
  if(trimmed.endsWith('{') || trimmed.endsWith('}')) return false;
  if(/^#/.test(trimmed)) return false;
  if(/^if\s*\(/.test(trimmed)) return false;
  if(/^else\b/.test(trimmed)) return false;
  if(/^for\s*\(/.test(trimmed)) return false;
  if(/^while\s*\(/.test(trimmed)) return false;
  return /(=|printf\s*\(|return\b|int\s+)/.test(trimmed);
}


function countSemicolonsOutsideString(text){
  let count = 0;
  let inString = false;
  let escape = false;
  for(const ch of text){
    if(escape){
      escape = false;
      continue;
    }
    if(ch === '\\'){
      escape = true;
      continue;
    }
    if(ch === '"'){
      inString = !inString;
      continue;
    }
    if(ch === ';' && !inString) count++;
  }
  return count;
}

function hasMultipleStatementsOnOneLine(trimmed){
  if(/^for\s*\(/.test(trimmed)) return false;
  return countSemicolonsOutsideString(trimmed) >= 2;
}

// ++ / -- / += / -= を、for専用ではない共通の変数更新として読み取ります。
function parseVariableUpdate(text, requiresSemicolon){
  const trimmed = String(text).trim();
  const hasSemicolon = trimmed.endsWith(';');
  if(requiresSemicolon !== hasSemicolon) return null;

  const code = hasSemicolon ? trimmed.slice(0, -1).trim() : trimmed;
  let match = code.match(/^([A-Za-z_]\w*)\s*(\+\+|--)$/);
  if(match){
    return {
      name:match[1],
      operator:match[2],
      amount:match[2] === '++' ? 1 : -1,
      source:code
    };
  }

  match = code.match(/^(\+\+|--)\s*([A-Za-z_]\w*)$/);
  if(match){
    return {
      name:match[2],
      operator:match[1],
      amount:match[1] === '++' ? 1 : -1,
      source:code
    };
  }

  match = code.match(/^([A-Za-z_]\w*)\s*(\+=|-=)\s*([-+]?\d+)$/);
  if(match){
    const integer = Number(match[3]);
    return {
      name:match[1],
      operator:match[2],
      amount:match[2] === '+=' ? integer : -integer,
      operand:integer,
      source:code
    };
  }

  return null;
}

// forヘッダを、初期化・条件・更新の3要素へ分けて構造として保持します。
function parseForHeader(structuralCode){
  const code = String(structuralCode).trim();
  const forMatch = code.match(/^for\b/);
  if(!forMatch){
    return { ok:false, error:'for文の開始位置を読み取れません。' };
  }

  let openIndex = forMatch[0].length;
  while(/\s/.test(code[openIndex] || '')) openIndex++;
  if(code[openIndex] !== '('){
    return { ok:false, error:'forの直後に、初期化・条件・更新を囲む丸かっこが必要です。' };
  }

  let depth = 0;
  let closeIndex = -1;
  for(let index = openIndex; index < code.length; index++){
    if(code[index] === '(') depth++;
    if(code[index] === ')'){
      depth--;
      if(depth === 0){
        closeIndex = index;
        break;
      }
      if(depth < 0) break;
    }
  }
  if(closeIndex < 0){
    return { ok:false, error:'forヘッダの閉じ丸かっこを確認してください。' };
  }

  const tail = code.slice(closeIndex + 1).trim();
  const compactTail = tail.replace(/\s/g, '');
  const inlineEmptyBody = compactTail === '{}';
  if(tail !== '{' && !inlineEmptyBody){
    return {
      ok:false,
      error:'現在のVisualizerでは、for文の開き波かっこをヘッダと同じ行に書き、本体を波かっこで囲んでください。'
    };
  }

  const headerText = code.slice(openIndex + 1, closeIndex);
  const clauses = [];
  let clause = '';
  depth = 0;
  for(const character of headerText){
    if(character === '(') depth++;
    if(character === ')') depth--;
    if(depth < 0){
      return { ok:false, error:'forヘッダ内の丸かっこの対応を確認してください。' };
    }
    if(character === ';' && depth === 0){
      clauses.push(clause.trim());
      clause = '';
    }else{
      clause += character;
    }
  }
  clauses.push(clause.trim());

  if(depth !== 0 || clauses.length !== 3){
    return { ok:false, error:'forヘッダは「初期化; 条件; 更新」の3つに分けて書いてください。' };
  }

  const [initializationText, condition, updateText] = clauses;
  if(!initializationText || !condition || !updateText){
    return { ok:false, error:'初期化・条件・更新を省略したfor文は現在未対応です。' };
  }
  if(clauses.some(part => part.includes(','))){
    return { ok:false, error:'複数式やカンマ演算子を使うforヘッダは現在未対応です。' };
  }

  const initializationMatch = initializationText.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/);
  if(!initializationMatch || /\+\+|--/.test(initializationMatch[2])){
    return {
      ok:false,
      error:'初期化部では、宣言済みのint変数への単純な代入を使用してください。forヘッダ内の変数宣言は現在未対応です。'
    };
  }

  const variableUpdate = parseVariableUpdate(updateText, false);
  let update;
  if(variableUpdate){
    update = { type:'variable-update', value:variableUpdate };
  }else{
    const assignmentMatch = updateText.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/);
    if(!assignmentMatch || /\+\+|--/.test(assignmentMatch[2])){
      return {
        ok:false,
        error:'更新部では、単独の++ / --、整数定数による+= / -=、または既存の代入式を使用してください。'
      };
    }
    update = {
      type:'assignment',
      name:assignmentMatch[1],
      expression:assignmentMatch[2].trim(),
      source:updateText
    };
  }

  return {
    ok:true,
    initialization:{
      name:initializationMatch[1],
      expression:initializationMatch[2].trim(),
      source:initializationText
    },
    condition,
    update
  };
}

// 文字列と行コメントを空白に置き換え、構文として読む部分だけを残します。
function codeOutsideStringAndLineComment(text){
  let code = '';
  let inString = false;
  let escape = false;
  for(let index = 0; index < text.length; index++){
    const ch = text[index];
    if(escape){
      escape = false;
      code += ' ';
      continue;
    }
    if(ch === '\\' && inString){
      escape = true;
      code += ' ';
      continue;
    }
    if(ch === '"'){
      inString = !inString;
      code += ' ';
      continue;
    }
    if(!inString && ch === '/' && text[index + 1] === '/') break;
    code += inString ? ' ' : ch;
  }
  return code;
}

// 文字列を残したまま、行コメントと複数行のブロックコメントを空白に置き換えます。
// 改行位置を保つことで、元のコードと行番号を一致させます。
function codeWithoutComments(text){
  let code = '';
  let inString = false;
  let inLineComment = false;
  let inBlockComment = false;
  let escape = false;

  for(let index = 0; index < text.length; index++){
    const ch = text[index];
    const next = text[index + 1];

    if(inLineComment){
      if(ch === '\n'){
        inLineComment = false;
        code += '\n';
      }else{
        code += ' ';
      }
      continue;
    }

    if(inBlockComment){
      if(ch === '*' && next === '/'){
        code += '  ';
        index++;
        inBlockComment = false;
      }else{
        code += ch === '\n' ? '\n' : ' ';
      }
      continue;
    }

    if(escape){
      code += ch;
      escape = false;
      continue;
    }
    if(inString && ch === '\\'){
      code += ch;
      escape = true;
      continue;
    }
    if(ch === '"'){
      code += ch;
      inString = !inString;
      continue;
    }
    if(!inString && ch === '/' && next === '/'){
      code += '  ';
      index++;
      inLineComment = true;
      continue;
    }
    if(!inString && ch === '/' && next === '*'){
      code += '  ';
      index++;
      inBlockComment = true;
      continue;
    }

    code += ch;
  }

  return code;
}

function bracesOutsideString(text){
  return [...codeOutsideStringAndLineComment(text)].filter(ch => ch === '{' || ch === '}');
}

// 対応形式のmain関数を探し、波かっこの深さから処理範囲を特定します。
function findMainExecutionRange(lines){
  for(let startIndex = 0; startIndex < lines.length; startIndex++){
    const structuralCode = codeOutsideStringAndLineComment(lines[startIndex]).trim();
    if(!/^int\s+main\s*\([^)]*\)\s*\{\s*$/.test(structuralCode)) continue;

    let depth = 0;
    let opened = false;
    for(let endIndex = startIndex; endIndex < lines.length; endIndex++){
      for(const brace of bracesOutsideString(lines[endIndex])){
        if(brace === '{'){
          depth++;
          opened = true;
        }else{
          depth--;
        }
      }
      if(opened && depth === 0){
        return { startIndex, endIndex, closed:true };
      }
    }
    return { startIndex, endIndex:lines.length - 1, closed:false };
  }
  return null;
}

// if条件の丸かっこの対応を数え、閉じ丸かっこの後ろにある本文を返します。
function inlineIfBodyCode(structuralCode){
  const ifMatch = structuralCode.match(/^\s*(?:else\s+)?if\s*\(/);
  if(!ifMatch) return null;

  const openIndex = structuralCode.indexOf('(', ifMatch.index);
  let depth = 0;
  for(let index = openIndex; index < structuralCode.length; index++){
    if(structuralCode[index] === '(') depth++;
    if(structuralCode[index] === ')'){
      depth--;
      if(depth === 0) return structuralCode.slice(index + 1).trim();
    }
  }
  return null;
}

// 未対応の制御構文について、閉じ丸かっこの後ろにある本文を返します。
function inlineUnsupportedControlBodyCode(structuralCode){
  const controlMatch = structuralCode.match(/^\s*(for|while|switch)\s*\(/);
  if(!controlMatch) return null;

  const openIndex = structuralCode.indexOf('(', controlMatch.index);
  let depth = 0;
  for(let index = openIndex; index < structuralCode.length; index++){
    if(structuralCode[index] === '(') depth++;
    if(structuralCode[index] === ')'){
      depth--;
      if(depth === 0) return structuralCode.slice(index + 1).trim();
    }
  }
  return null;
}

function makeVisibleDisplayText(text){
  return text.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function isIdentifier(text){
  return /^[A-Za-z_]\w*$/.test(String(text).trim());
}

function describePrintfArg(arg, value){
  const raw = String(arg).trim();
  if(isIdentifier(raw)){
    return `<code>${escapeHtml(raw)}</code> に代入されている <code>${value}</code>`;
  }
  return `<code>${escapeHtml(raw)}</code> を計算した結果 <code>${value}</code>`;
}

function splitArgs(text){
  const result = [];
  let current = '';
  let depth = 0;
  for(const ch of text){
    if(ch === '(') depth++;
    if(ch === ')') depth--;
    if(ch === ',' && depth === 0){
      result.push(current.trim());
      current = '';
    }else{
      current += ch;
    }
  }
  if(current.trim() !== '') result.push(current.trim());
  return result;
}

function tokenizeExpression(expr){
  const tokens = [];
  const regex = /\s*([A-Za-z_]\w*|\d+|[()+\-*/%])\s*/g;
  let match;
  let consumed = '';
  while((match = regex.exec(expr)) !== null){
    tokens.push(match[1]);
    consumed += match[0];
  }
  if(consumed.replace(/\s/g, '') !== expr.replace(/\s/g, '')){
    return { ok:false, tokens:[], error:'対応していない文字が式に含まれています。' };
  }
  return { ok:true, tokens };
}

function evaluateArithmeticExpression(expr, variables){
  if(/\+\+|--/.test(expr)){
    return { ok:false, error:'式の中で使う ++ と -- は現在未対応です。値を1増減するときは、単独の更新文として使用してください。' };
  }

  const tokenResult = tokenizeExpression(expr);
  if(!tokenResult.ok) return { ok:false, error:tokenResult.error };

  const tokens = tokenResult.tokens;
  let pos = 0;
  const usedVars = [];

  function peek(){ return tokens[pos]; }
  function consume(){ return tokens[pos++]; }

  function parseExpression(){
    let left = parseTerm();
    if(!left.ok) return left;
    while(peek() === '+' || peek() === '-'){
      const op = consume();
      const right = parseTerm();
      if(!right.ok) return right;
      const before = `${left.readable} ${op} ${right.readable}`;
      left = {
        ok:true,
        value: op === '+' ? left.value + right.value : left.value - right.value,
        readable:`${before}`
      };
    }
    return left;
  }

  function parseTerm(){
    let left = parseFactor();
    if(!left.ok) return left;
    while(peek() === '*' || peek() === '/' || peek() === '%'){
      const op = consume();
      const right = parseFactor();
      if(!right.ok) return right;
      if((op === '/' || op === '%') && right.value === 0){
        return { ok:false, error:'0で割ろうとしています。' };
      }
      let value;
      if(op === '*') value = left.value * right.value;
      if(op === '/') value = Math.trunc(left.value / right.value);
      if(op === '%') value = left.value % right.value;
      left = {
        ok:true,
        value,
        readable:`${left.readable} ${op} ${right.readable}`
      };
    }
    return left;
  }

  function parseFactor(){
    const token = consume();
    if(token === undefined) return { ok:false, error:'式が途中で終わっています。' };

    if(token === '+') return parseFactor();
    if(token === '-'){
      const factor = parseFactor();
      if(!factor.ok) return factor;
      return { ok:true, value:-factor.value, readable:`-${factor.readable}` };
    }

    if(/^\d+$/.test(token)){
      return { ok:true, value:Number(token), readable:token };
    }

    if(/^[A-Za-z_]\w*$/.test(token)){
      if(!(token in variables)){
        return { ok:false, error:`変数 ${token} は宣言されていません。` };
      }
      if(variables[token] === UNINITIALIZED){
        return { ok:false, error:`変数 ${token} は宣言されていますが、まだ値が代入されていません。` };
      }
      usedVars.push({ name:token, value:variables[token] });
      return { ok:true, value:variables[token], readable:`${token}(${variables[token]})` };
    }

    if(token === '('){
      const inside = parseExpression();
      if(!inside.ok) return inside;
      if(peek() !== ')') return { ok:false, error:'かっこの閉じ忘れがあります。' };
      consume();
      return { ok:true, value:inside.value, readable:`(${inside.readable})` };
    }

    return { ok:false, error:`${token} は式として読み取れません。` };
  }

  const result = parseExpression();
  if(!result.ok) return result;
  if(pos < tokens.length){
    return { ok:false, error:'式の途中に読み取れない部分があります。' };
  }

  return { ok:true, value:result.value, readable:result.readable, usedVars };
}

function findComparison(expr){
  const operators = ['<=', '>=', '==', '!=', '<', '>'];
  const comparisons = [];
  let depth = 0;

  for(let index = 0; index < expr.length; index++){
    const ch = expr[index];
    if(ch === '(') depth++;
    if(ch === ')') depth--;
    if(depth !== 0) continue;

    const operator = operators.find(candidate => expr.startsWith(candidate, index));
    if(operator){
      comparisons.push({ operator, index });
      index += operator.length - 1;
    }
  }

  if(comparisons.length > 1){
    return { ok:false, error:'複数の比較演算子を含む式は読み取れません。' };
  }
  return { ok:true, comparison:comparisons[0] || null };
}

function stripWrappingParentheses(expr){
  let stripped = String(expr).trim();

  while(stripped.startsWith('(') && stripped.endsWith(')')){
    let depth = 0;
    let wrapsWholeExpression = true;

    for(let index = 0; index < stripped.length; index++){
      if(stripped[index] === '(') depth++;
      if(stripped[index] === ')') depth--;

      // 最初の開き括弧が末尾より前で閉じるなら、式全体を包んでいません。
      if(depth === 0 && index < stripped.length - 1){
        wrapsWholeExpression = false;
        break;
      }
      if(depth < 0){
        wrapsWholeExpression = false;
        break;
      }
    }

    if(!wrapsWholeExpression || depth !== 0) break;
    stripped = stripped.slice(1, -1).trim();
  }

  return stripped;
}

function evaluateExpression(expr, variables){
  // 比較式全体を包む冗長な括弧だけを外し、内側の比較を見つけます。
  const normalizedExpr = stripWrappingParentheses(expr);
  const found = findComparison(normalizedExpr);
  if(!found.ok) return found;
  if(!found.comparison) return evaluateArithmeticExpression(normalizedExpr, variables);

  const { operator, index } = found.comparison;
  const leftExpr = normalizedExpr.slice(0, index).trim();
  const rightExpr = normalizedExpr.slice(index + operator.length).trim();
  if(!leftExpr || !rightExpr){
    return { ok:false, error:'比較演算子の左右に式を書いてください。' };
  }

  // 比較の左右は、これまでと同じ四則演算パーサーで先に計算します。
  const left = evaluateArithmeticExpression(leftExpr, variables);
  if(!left.ok) return left;
  const right = evaluateArithmeticExpression(rightExpr, variables);
  if(!right.ok) return right;

  const conditions = {
    '<': left.value < right.value,
    '<=': left.value <= right.value,
    '>': left.value > right.value,
    '>=': left.value >= right.value,
    '==': left.value === right.value,
    '!=': left.value !== right.value
  };
  const conditionMet = conditions[operator];

  return {
    ok:true,
    value:conditionMet ? 1 : 0,
    readable:`${left.readable} ${operator} ${right.readable}`,
    usedVars:[...left.usedVars, ...right.usedVars],
    comparison:{
      operator,
      leftValue:left.value,
      rightValue:right.value,
      conditionMet
    }
  };
}

function describeComparison(result){
  const comparison = result.comparison;
  const left = comparison.leftValue;
  const right = comparison.rightValue;
  const conclusions = {
    '<':{
      true:`${left} は ${right} より小さいので、条件は成立します。`,
      false:`${left} は ${right} より小さくないため、条件は成立しません。`
    },
    '<=':{
      true:`${left} は ${right} 以下なので、条件は成立します。`,
      false:`${left} は ${right} 以下ではないため、条件は成立しません。`
    },
    '>':{
      true:`${left} は ${right} より大きいので、条件は成立します。`,
      false:`${left} は ${right} より大きくないため、条件は成立しません。`
    },
    '>=':{
      true:`${left} は ${right} 以上なので、条件は成立します。`,
      false:`${left} は ${right} 以上ではないため、条件は成立しません。`
    },
    '==':{
      true:`${left} と ${right} は等しいので、条件は成立します。`,
      false:`${left} と ${right} は等しくないため、条件は成立しません。`
    },
    '!=':{
      true:`${left} と ${right} は等しくないので、条件は成立します。`,
      false:`${left} と ${right} は等しいため、条件は成立しません。`
    }
  };
  const conclusion = conclusions[comparison.operator][comparison.conditionMet];
  return `${escapeHtml(result.readable)} を計算し、左右の値を比較しました。${conclusion}`;
}


function isSimpleIntegerLiteral(expr){
  return /^[-+]?\d+$/.test(String(expr).trim());
}

function makeInitialValueExplanation(name, expr, result){
  if(result.comparison){
    const cValue = result.comparison.conditionMet ? '成立を1' : '不成立を0';
    return {
      analysis:`${describeComparison(result)} C言語では条件の${cValue}として扱うため、<code>${name}</code> に <code>${result.value}</code> を代入しました。`,
      step:`${describeComparison(result)} ${name} に ${result.value} を代入しました。`
    };
  }
  if(isSimpleIntegerLiteral(expr)){
    return {
      analysis:`整数型の変数 <code>${name}</code> を作り、<code>${result.value}</code> を代入しました。`,
      step:`${name} という整数の箱を作り、${result.value} を代入しました。`
    };
  }
  return {
    analysis:`整数型の変数 <code>${name}</code> を作り、<code>${escapeHtml(expr)}</code> を計算した結果 <code>${result.value}</code> を代入しました。`,
    step:`${name} という整数の箱を作り、${escapeHtml(result.readable)} の結果である ${result.value} を代入しました。`
  };
}

function formatPrintfString(format, values){
  let index = 0;
  let text = format.replace(/%d/g, () => {
    const value = values[index++];
    return value !== undefined ? String(value) : '%d';
  });
  text = text
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
  return { text, usedCount:index };
}

function matchSimplePrintfStatement(text){
  return String(text).trim().match(/^printf\s*\(\s*"((?:\\.|[^"\\])*)"\s*(?:,\s*(.*))?\)\s*;$/);
}

function visualizeCode(){
  updateCodeEditor();
  const code = document.getElementById('codeInput').value.replace(/\r\n/g, '\n');
  const scanfInput = document.getElementById('scanfInput');
  const scanfValues = String(scanfInput?.value || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(value => value.trim())
    .filter(value => value !== '');
  const lines = code.split('\n');
  const executableLines = codeWithoutComments(code).split('\n');
  const mainRange = findMainExecutionRange(executableLines);
  const analysis = {};
  const hints = [];
  const executedLines = new Set();
  const warningLines = new Set();
  const variables = {};
  const variableOrder = [];
  const steps = [];
  let output = '';
  let braceBalance = 0;
  let hasMain = mainRange !== null;
  let hasReturn = false;
  const hasReturnInMain = mainRange?.closed
    ? executableLines
      .slice(mainRange.startIndex + 1, mainRange.endIndex)
      .some(line => /^return\s+0\s*;$/.test(line.trim()))
    : false;
  let scanfValueIndex = 0;
  let stepNo = 1;

  for(const executableLine of executableLines){
    for(const ch of bracesOutsideString(executableLine)){
      if(ch === '{') braceBalance++;
      if(ch === '}') braceBalance--;
    }
  }

  function rememberVariable(name, value){
    if(!(name in variables)) variableOrder.push(name);
    variables[name] = value;
  }

  function addStep(lineNo, text, markAsExecuted = true){
    steps.push({ step:stepNo++, lineNo, text });
    if(markAsExecuted) executedLines.add(lineNo);
  }

  // main直下・for初期化・for更新で同じ代入処理を共有します。
  function executeAssignment(name, expr, lineNo, contextLabel = ''){
    const analysisPrefix = contextLabel ? `<strong>${escapeHtml(contextLabel)}：</strong> ` : '';
    const stepPrefix = contextLabel ? `${contextLabel}：` : '';

    if(!(name in variables)){
      addAnalysis(analysis, lineNo, `${analysisPrefix}変数 <code>${name}</code> に代入しようとしています。`);
      addHint(hints, lineNo, '宣言前の代入かも', `変数 <code>${name}</code> が先に <code>int ${name};</code> のように宣言されているか確認してみましょう。`);
      warningLines.add(lineNo);
      return { ok:false };
    }

    const result = evaluateExpression(expr, variables);
    if(!result.ok){
      addAnalysis(analysis, lineNo, `${analysisPrefix}変数 <code>${name}</code> への代入を読み取ろうとしましたが、式を計算できませんでした。`);
      addHint(hints, lineNo, '式を計算できません', escapeHtml(result.error));
      warningLines.add(lineNo);
      return { ok:false };
    }

    const before = variables[name];
    rememberVariable(name, result.value);
    if(result.comparison){
      const cValue = result.comparison.conditionMet ? '成立を1' : '不成立を0';
      addAnalysis(analysis, lineNo, `${analysisPrefix}${describeComparison(result)} C言語では条件の${cValue}として扱うため、<code>${name}</code> に <code>${result.value}</code> を代入しました。`);
    }else{
      addAnalysis(analysis, lineNo, `${analysisPrefix}変数 <code>${name}</code> に、<code>${escapeHtml(expr)}</code> の計算結果 <code>${result.value}</code> を代入しました。`);
    }

    if(before === UNINITIALIZED){
      addStep(lineNo, `${stepPrefix}${name} の中身に ${result.value} を代入しました。計算：${escapeHtml(result.readable)} = ${result.value}`);
    }else{
      addStep(lineNo, `${stepPrefix}${name} の中身を ${before} から ${result.value} に変えました。計算：${escapeHtml(result.readable)} = ${result.value}`);
    }
    return { ok:true, value:result.value };
  }

  // 許可された場所の ++ / -- / += / -= は、すべてこの共通処理で更新します。
  function executeVariableUpdate(update, lineNo, contextLabel = ''){
    const analysisPrefix = contextLabel ? `<strong>${escapeHtml(contextLabel)}：</strong> ` : '';
    const stepPrefix = contextLabel ? `${contextLabel}：` : '';
    const name = update.name;

    if(!(name in variables)){
      addAnalysis(analysis, lineNo, `${analysisPrefix}変数 <code>${name}</code> を更新しようとしています。`);
      addHint(hints, lineNo, '宣言前の更新かも', `変数 <code>${name}</code> が先に <code>int ${name};</code> のように宣言されているか確認してみましょう。`);
      warningLines.add(lineNo);
      return { ok:false };
    }
    if(variables[name] === UNINITIALIZED){
      addAnalysis(analysis, lineNo, `${analysisPrefix}変数 <code>${name}</code> はまだ値が代入されていないため、更新できませんでした。`);
      addHint(hints, lineNo, '更新する値がありません', `変数 <code>${name}</code> に整数を代入してから更新してください。`);
      warningLines.add(lineNo);
      return { ok:false };
    }

    const before = variables[name];
    const after = before + update.amount;
    rememberVariable(name, after);
    const direction = update.amount >= 0 ? '増やし' : '減らし';
    addAnalysis(
      analysis,
      lineNo,
      `${analysisPrefix}<code>${escapeHtml(update.source)}</code> により、変数 <code>${name}</code> を <code>${Math.abs(update.amount)}</code> ${direction}、<code>${before}</code> から <code>${after}</code> に更新しました。`
    );
    addStep(lineNo, `${stepPrefix}${name} の中身を ${before} から ${after} に変えました。更新：${escapeHtml(update.source)}`);
    return { ok:true, value:after };
  }

  function processSimpleLine(rawLine, index, insideIf = false, insideFor = false){
    const lineNo = index + 1;
    const rawTrimmed = rawLine.trim();
    const trimmed = executableLines[index].trim();

    if(trimmed === ''){
      const message = rawTrimmed === ''
        ? '空欄です。処理は行いません。'
        : 'コメントです。プログラムの動作には直接関係しません。';
      addAnalysis(analysis, lineNo, message);
      return;
    }

    const structuralCode = codeOutsideStringAndLineComment(trimmed);

    const hasScanfCall = /^scanf\b/.test(structuralCode) || /\bscanf\s*\(/.test(structuralCode);
    if(insideFor && hasScanfCall){
      addAnalysis(analysis, lineNo, 'for文の本体内でscanfを使う形は現在未対応です。');
      addHint(hints, lineNo, 'for文内のscanfは未対応', 'Stage1では、scanfはmain直下に置く場合だけ実行できます。');
      warningLines.add(lineNo);
      return 'execution-error';
    }

    if(!insideIf && hasScanfCall){
      function stopScanf(title, message){
        addAnalysis(analysis, lineNo, `${message} この行でプログラムの実行を停止します。`);
        addHint(hints, lineNo, title, message);
        warningLines.add(lineNo);
        addStep(lineNo, 'scanfを実行できないため、プログラムの実行を停止します。');
        return 'scanf-error';
      }

      if(!structuralCode.trim().endsWith(';')){
        return stopScanf(
          'セミコロンの不足かも',
          'scanfの文末に <code>;</code> が必要です。セミコロンが付いているか確認してください。'
        );
      }

      const scanfMatch = trimmed.match(/^scanf\s*\(\s*"%d"\s*,\s*&\s*([A-Za-z_]\w*)\s*\)\s*;$/);
      if(!scanfMatch){
        return stopScanf(
          'このscanf形式は未対応',
          '現在は <code>scanf("%d", &amp;変数);</code> の形で、宣言済みのint変数へ整数を1つ入力する場合に対応しています。'
        );
      }

      const name = scanfMatch[1];
      if(!(name in variables)){
        return stopScanf(
          'scanfの変数が宣言されていません',
          `変数 <code>${name}</code> が先に <code>int ${name};</code> のように宣言されているか確認してください。`
        );
      }

      if(scanfValueIndex >= scanfValues.length){
        return stopScanf(
          'scanfの入力値が足りません',
          'scanfで使う入力値が足りません。「入力値（scanf用）」に整数を追加してください。'
        );
      }

      const inputText = scanfValues[scanfValueIndex];
      if(!/^[-+]?\d+$/.test(inputText)){
        return stopScanf(
          'scanfで整数を読み取れません',
          'scanfで整数として読み取れない入力値です。1行に1つ、整数を入力してください。'
        );
      }

      const inputValue = Number(inputText);
      scanfValueIndex++;
      rememberVariable(name, inputValue);
      addAnalysis(analysis, lineNo, `入力値 <code>${escapeHtml(inputText)}</code> を整数として受け取り、変数 <code>${name}</code> に代入します。`);
      addStep(lineNo, `入力値 ${escapeHtml(inputText)} を整数として受け取り、変数 ${name} に代入しました。`);
      return;
    }

    if(hasMultipleStatementsOnOneLine(trimmed)){
      const message = '1行に複数の文があります。文の終わりで改行してください。';
      addAnalysis(analysis, lineNo, message);
      addHint(hints, lineNo, '改行の確認', message);
      warningLines.add(lineNo);
      return;
    }

    if(insideIf && !/^int\s+/.test(trimmed) &&
       !/^[A-Za-z_]\w*\s*=/.test(trimmed) && !/^printf\s*\(/.test(trimmed)){
      addAnalysis(analysis, lineNo, 'この処理はif側・else側の中では現在未対応のため、実行しません。');
      addHint(hints, lineNo, '分岐内では未対応', 'if側・else側では、既存の変数への代入とprintfだけを実行できます。');
      warningLines.add(lineNo);
      return;
    }

    const variableUpdate = parseVariableUpdate(trimmed, true);
    if(variableUpdate){
      const result = executeVariableUpdate(variableUpdate, lineNo);
      return !result.ok && insideFor ? 'execution-error' : undefined;
    }

    if(/\+\+|--/.test(structuralCode)){
      const message = '式の中で評価値や副作用を利用する ++ と -- は現在未対応です。この行は実行しません。単独の更新文として使用してください。';
      addAnalysis(analysis, lineNo, message);
      addHint(hints, lineNo, '++・--は未対応', message);
      warningLines.add(lineNo);
      return insideFor ? 'execution-error' : undefined;
    }

    let checkTarget = trimmed;
    if(trimmed.includes('printf')) checkTarget = trimmed.replace(/".*?"/g, '');
    if(/[Ａ-Ｚａ-ｚ０-９（）｛｝［］；，％＋－＊／＝＜＞”’　]/.test(checkTarget)){
      addHint(hints, lineNo, '全角文字の可能性', 'printfの文字列以外の部分に、全角の英数字・記号・スペースが含まれている可能性があります。半角で入力されているか確認してみましょう。');
      warningLines.add(lineNo);
    }

    if(/^#include\s*</.test(trimmed)){
      addAnalysis(analysis, lineNo, '標準入出力を使うための定型文です。今回は実行ステップには含めません。');
      return;
    }

    if(/^int\s+main\s*\(/.test(trimmed)){
      hasMain = true;
      addAnalysis(analysis, lineNo, 'プログラムの開始地点です。ここから中の処理を順番に読んでいきます。');
      return;
    }

    if(trimmed === '{' || trimmed === '}'){
      addAnalysis(analysis, lineNo, trimmed === '{' ? '処理のまとまりの開始です。' : '処理のまとまりの終了です。');
      return;
    }

    if(/^return\s+0\s*;?$/.test(trimmed)){
      hasReturn = true;
      addAnalysis(analysis, lineNo, 'プログラムを正常に終了するための文です。');
      addStep(lineNo, 'プログラムを終了します。');
      return 'program-ended';
    }

    if(/^if\s*\(/.test(trimmed) || /^for\s*\(/.test(trimmed) || /^while\s*\(/.test(trimmed)){
      addAnalysis(analysis, lineNo, 'Ver.0.6_0812では未対応の構文です。今後の拡張対象として扱います。');
      addHint(hints, lineNo, 'Ver.0.6_0812では未対応', '現在は int、代入、整数の四則演算、比較式、printf、main直下の単純なscanf、単純なif〜else文、最大2階層の単純な入れ子if・if〜elseの処理過程可視化に対応しています。この行は正確には実行シミュレートしていません。');
      warningLines.add(lineNo);
      return;
    }

    const declMatch = trimmed.match(/^int\s+([A-Za-z_]\w*)\s*(?:=\s*(.+))?;$/);
    if(declMatch){
      if(insideIf || insideFor){
        const scopeLabel = insideFor ? 'for文の本体' : 'if側・else側';
        const hintTitle = insideFor ? 'for文内の変数宣言は未対応' : '分岐内の変数宣言は未対応';
        addAnalysis(analysis, lineNo, `${scopeLabel}で新しい変数を宣言する処理は、現在未対応です。この行は実行しません。`);
        addHint(hints, lineNo, hintTitle, 'ブロックスコープを正確に再現できないため、変数は登録しません。');
        warningLines.add(lineNo);
        return insideFor ? 'execution-error' : undefined;
      }
      const name = declMatch[1];
      const expr = declMatch[2];
      if(expr === undefined){
        rememberVariable(name, UNINITIALIZED);
        addAnalysis(analysis, lineNo, `整数型の変数 <code>${name}</code> を作りました。まだ値は代入されていません。`);
        addStep(lineNo, `${name} という整数の箱を作りました。中身はまだ入っていません。`);
        return;
      }

      const result = evaluateExpression(expr, variables);
      if(result.ok){
        rememberVariable(name, result.value);
        const explanation = makeInitialValueExplanation(name, expr, result);
        addAnalysis(analysis, lineNo, explanation.analysis);
        addStep(lineNo, explanation.step);
      }else{
        addAnalysis(analysis, lineNo, `変数 <code>${name}</code> の初期化を読み取ろうとしましたが、式を計算できませんでした。`);
        addHint(hints, lineNo, '式を計算できません', escapeHtml(result.error));
        warningLines.add(lineNo);
      }
      return;
    }

    const assignMatch = trimmed.match(/^([A-Za-z_]\w*)\s*=\s*(.+);$/);
    if(assignMatch){
      const name = assignMatch[1];
      const expr = assignMatch[2];
      const result = executeAssignment(name, expr, lineNo);
      return !result.ok && insideFor ? 'execution-error' : undefined;
    }

    const printfMatch = matchSimplePrintfStatement(trimmed);
    if(printfMatch){
      const format = printfMatch[1];
      if(format.includes('%%')){
        const message = 'printfの %% は現在未対応です。この行は、実際のC言語と異なる表示を避けるため実行しません。';
        addAnalysis(analysis, lineNo, message);
        addHint(hints, lineNo, 'printfの%%は未対応', message);
        warningLines.add(lineNo);
        return insideFor ? 'execution-error' : undefined;
      }

      const argText = printfMatch[2] || '';
      const args = argText ? splitArgs(argText) : [];
      const values = [];
      const results = [];
      const readableArgs = [];
      let ok = true;
      let error = '';

      for(const arg of args){
        const result = evaluateExpression(arg, variables);
        if(result.ok){
          values.push(result.value);
          results.push(result);
          readableArgs.push(`${escapeHtml(arg)} → ${result.value}`);
        }else{
          ok = false;
          error = result.error;
          break;
        }
      }

      if(ok){
        const formatted = formatPrintfString(format, values);
        output += formatted.text;
        const visibleText = makeVisibleDisplayText(formatted.text);
        let explanation;
        if(args.length){
          const argDescriptions = args.map((arg, i) => describePrintfArg(arg, values[i]));
          if(args.length === 1 && results[0].comparison){
            explanation = `${describeComparison(results[0])} 比較結果の <code>${values[0]}</code> をprintfで画面に表示しました。`;
          }else if(args.length === 1){
            explanation = `printfで ${argDescriptions[0]} を画面に表示しました。`;
          }else{
            explanation = `printfで ${argDescriptions.join(' と ')} を使い、画面に「${escapeHtml(visibleText)}」を表示しました。`;
          }
        }else{
          explanation = `printfで文字列「${escapeHtml(visibleText)}」を画面に表示しました。`;
        }
        addAnalysis(analysis, lineNo, explanation);
        addStep(lineNo, `画面に「${escapeHtml(visibleText)}」を表示しました。`);
        if((format.match(/%d/g) || []).length !== args.length){
          addHint(hints, lineNo, 'printfの指定と値の数を確認', '書式指定子 <code>%d</code> の数と、後ろに並べる値の数が合っているか確認してみましょう。');
          warningLines.add(lineNo);
        }
      }else{
        addAnalysis(analysis, lineNo, 'printfで表示しようとしましたが、表示する値を計算できませんでした。');
        addHint(hints, lineNo, 'printfの値を確認', escapeHtml(error));
        warningLines.add(lineNo);
        return insideFor ? 'execution-error' : undefined;
      }
      return;
    }

    if(shouldProbablyEndWithSemicolon(trimmed)){
      addHint(hints, lineNo, 'セミコロンの不足かも', '文末に <code>;</code> が必要な可能性があります。直前の行も含めて見直してみましょう。');
      warningLines.add(lineNo);
    }

    addAnalysis(analysis, lineNo, 'Ver.0.6_0812では説明未対応のコードです。');
    if(trimmed !== ''){
      addHint(hints, lineNo, '未対応コード', 'この行は現在の可視化対象外です。まずは int、代入、整数の四則演算、比較式、printf、main直下の単純なscanf、単純なif〜else文、最大2階層の単純な入れ子if・if〜elseの範囲で試してみましょう。');
      warningLines.add(lineNo);
    }
    return insideFor ? 'execution-error' : undefined;
  }

  function describeNonExecutableLine(rawLine, index, reason){
    const trimmed = executableLines[index].trim();
    const lineNo = index + 1;

    if(trimmed === '' || /^#include\s*</.test(trimmed)){
      processSimpleLine(rawLine, index);
      return;
    }

    addAnalysis(analysis, lineNo, reason);
  }

  function markSkippedIfBody(startIndex, endIndex, evaluationFailed, customReason = ''){
    const reason = customReason || (evaluationFailed
      ? 'if文の条件を評価できなかったため、この行は実行されませんでした。'
      : 'if文の条件が成立しなかったため、この行は実行されませんでした。');
    for(let bodyIndex = startIndex; bodyIndex < endIndex; bodyIndex++){
      markSkippedLine(bodyIndex, reason);
    }
  }

  function markSkippedLine(index, reason){
    const trimmed = executableLines[index].trim();
    if(trimmed === ''){
      processSimpleLine(lines[index], index, true);
      return;
    }

    addSkippedLineWarnings(index, trimmed);
    if(/^int\s+/.test(trimmed)){
      addAnalysis(analysis, index + 1, `${reason} また、if側・else側で新しい変数を宣言する処理は現在未対応です。`);
      addHint(hints, index + 1, '分岐内の変数宣言は未対応', 'ブロックスコープを正確に再現できないため、変数は登録しません。');
      warningLines.add(index + 1);
    }else{
      addAnalysis(analysis, index + 1, reason);
    }
  }

  function addSkippedLineWarnings(index, trimmed){
    if(!hasMultipleStatementsOnOneLine(trimmed)) return;
    const message = '1行に複数の文があります。文の終わりで改行してください。';
    addAnalysis(analysis, index + 1, message);
    addHint(hints, index + 1, '改行の確認', message);
    warningLines.add(index + 1);
  }

  function warnUnsupportedIf(startIndex, endIndex, title, message){
    const lineNo = startIndex + 1;
    addAnalysis(analysis, lineNo, message);
    addHint(hints, lineNo, title, message);
    warningLines.add(lineNo);
    for(let index = startIndex + 1; index <= endIndex && index < lines.length; index++){
      const trimmed = executableLines[index].trim();
      if(trimmed === ''){
        processSimpleLine(lines[index], index, true);
      }else{
        addAnalysis(analysis, index + 1, '未対応のif文に含まれるため、この行は実行されませんでした。');
        addSkippedLineWarnings(index, trimmed);
      }
    }
  }

  function findIfBlock(startIndex){
    let depth = 0;
    let nested = false;
    let unsupportedBlock = false;
    let hasElse = false;

    for(let index = startIndex; index < lines.length; index++){
      const trimmed = executableLines[index].trim();
      const structuralCode = codeOutsideStringAndLineComment(trimmed);
      if(index > startIndex && /^\s*if\s*\(/.test(structuralCode)) nested = true;
      if(/\belse\b/.test(structuralCode)) hasElse = true;
      if(index > startIndex && (/^\s*(for|while|switch)\s*\(/.test(structuralCode) || /^\s*do\b/.test(structuralCode))) unsupportedBlock = true;
      const structuralBraces = bracesOutsideString(trimmed);
      if(index > startIndex && structuralBraces.includes('{')) unsupportedBlock = true;
      for(const brace of structuralBraces){
        depth += brace === '{' ? 1 : -1;
      }

      if(depth === 0 && index >= startIndex){
        if(/\belse\b/.test(structuralCode)){
          return {
            endIndex:findElseControlledStatementEnd(index),
            nested,
            unsupportedBlock,
            hasElse:true,
            closed:true
          };
        }

        let next = index + 1;
        while(next < lines.length && executableLines[next].trim() === '') next++;
        if(next < lines.length && /^else\b/.test(codeOutsideStringAndLineComment(executableLines[next]).trim())){
          return {
            endIndex:findElseControlledStatementEnd(next),
            nested,
            unsupportedBlock,
            hasElse:true,
            closed:true
          };
        }
        return { endIndex:index, nested, unsupportedBlock, hasElse, closed:executableLines[index].trim() === '}' };
      }
    }
    return { endIndex:lines.length - 1, nested, unsupportedBlock, hasElse, closed:false };
  }

  // 外側のif全体を条件評価より先に調べ、最大2階層の対応構造だけを受け付けます。
  // 選択されない側も構造だけは確認しますが、条件式や文の実行はここでは行いません。
  function inspectSupportedOuterIf(startIndex){
    const outerRange = findIfBlock(startIndex);
    const safeEndIndex = Math.min(outerRange.endIndex, Math.max(startIndex, executionEndIndex - 1));

    function failure(title, message){
      return { ok:false, title, message, endIndex:safeEndIndex };
    }

    function unsupportedNestedIfForm(structuralCode){
      const nextLineBrace = inlineIfBodyCode(structuralCode) === '';
      if(nextLineBrace){
        return failure(
          '入れ子のif文の書き方は未対応',
          '入れ子のif文では、開き波かっこをif文と同じ行に書いてください。外側のif文全体は実行しません。'
        );
      }
      return failure(
        '入れ子のif文の書き方は未対応',
        '波かっこを省略した入れ子のif文は現在未対応です。外側のif文全体は実行しません。'
      );
    }

    function parseBranch(bodyStartIndex, depth){
      const nestedIfs = [];

      for(let index = bodyStartIndex; index < executionEndIndex; index++){
        const structuralCode = codeOutsideStringAndLineComment(executableLines[index]).trim();
        if(structuralCode === '') continue;

        if(structuralCode.startsWith('}')){
          return { ok:true, endIndex:index, closingCode:structuralCode, nestedIfs };
        }

        if(/^if\b/.test(structuralCode)){
          const nestedHeader = structuralCode.match(/^if\s*\((.*)\)\s*\{$/);
          if(!nestedHeader) return unsupportedNestedIfForm(structuralCode);
          if(depth >= 2){
            return failure(
              '3階層以上のifは未対応',
              '3階層以上に入れ子になったif文は現在未対応です。外側のif文全体は実行しません。'
            );
          }

          const nestedIf = parseIf(index, depth + 1, true);
          if(!nestedIf.ok) return nestedIf;
          nestedIfs.push(nestedIf);
          index = nestedIf.endIndex;
          continue;
        }

        if(/^else\b/.test(structuralCode)){
          return failure(
            'このelse付きif文は未対応',
            '対応するif文を安全に確定できないelseがあります。外側のif文全体は実行しません。'
          );
        }

        if(/^scanf\b/.test(structuralCode) || /\bscanf\s*\(/.test(structuralCode)){
          return failure(
            '分岐内のscanfは未対応',
            'if側・else側の中にscanfがある形は現在未対応です。外側のif文全体は実行しません。'
          );
        }

        const unsupportedControl = unsupportedControlInfo(structuralCode);
        if(unsupportedControl){
          return failure(
            '入れ子のブロックは未対応',
            `${unsupportedControl.label}を含むif文の入れ子は現在未対応です。外側のif文全体は実行しません。`
          );
        }

        if(bracesOutsideString(executableLines[index]).length > 0){
          return failure(
            '入れ子のブロックは未対応',
            '対応範囲を確定できないブロックがif文内にあります。外側のif文全体は実行しません。'
          );
        }
      }

      return failure(
        '閉じ波かっこを確認',
        'if文の処理範囲を最後まで確認できないため、外側のif文全体は実行しません。'
      );
    }

    function parseIf(ifIndex, depth, allowElse){
      const structuralCode = codeOutsideStringAndLineComment(executableLines[ifIndex]).trim();
      const headerMatch = structuralCode.match(/^if\s*\((.*)\)\s*\{$/);
      if(!headerMatch){
        return depth > 1
          ? unsupportedNestedIfForm(structuralCode)
          : failure('if文の書き方を確認', '対応範囲を確定できないif文のため、処理全体は実行しません。');
      }

      const ifBranch = parseBranch(ifIndex + 1, depth);
      if(!ifBranch.ok) return ifBranch;

      let elseIndex = -1;
      let elseHeaderCode = '';
      let combinedElseLine = false;
      const afterClose = ifBranch.closingCode.slice(1).trim();

      if(afterClose !== ''){
        if(!/^else\b/.test(afterClose)){
          return failure('閉じ波かっこを確認', 'if文の閉じ波かっこの後ろに未対応のコードがあります。外側のif文全体は実行しません。');
        }
        elseIndex = ifBranch.endIndex;
        elseHeaderCode = afterClose;
        combinedElseLine = true;
      }else{
        const candidateIndex = nextSignificantLine(ifBranch.endIndex + 1);
        if(candidateIndex < executionEndIndex){
          const candidateCode = codeOutsideStringAndLineComment(executableLines[candidateIndex]).trim();
          if(/^else\b/.test(candidateCode)){
            elseIndex = candidateIndex;
            elseHeaderCode = candidateCode;
          }
        }
      }

      if(elseIndex < 0){
        return {
          ok:true,
          startIndex:ifIndex,
          condition:headerMatch[1].trim(),
          ifBodyStartIndex:ifIndex + 1,
          ifEndIndex:ifBranch.endIndex,
          ifNestedIfs:ifBranch.nestedIfs,
          hasElse:false,
          endIndex:ifBranch.endIndex
        };
      }

      if(!allowElse){
        return failure(
          '入れ子のif〜elseは未対応',
          '入れ子のif文にelseを付ける形は現在未対応です。外側のif文全体は実行しません。'
        );
      }

      if(!/^else\s*\{$/.test(elseHeaderCode)){
        return failure(
          'このelse付きif文は未対応',
          '単純なelse付きif文だけに対応しています。else if、波かっこの省略、elseの次の行に開き波かっこを書く形は実行しません。'
        );
      }

      const elseBranch = parseBranch(elseIndex + 1, depth);
      if(!elseBranch.ok) return elseBranch;
      if(elseBranch.closingCode !== '}'){
        return failure(
          '閉じ波かっこを確認',
          'else文の終わりを安全に確定できないため、外側のif文全体は実行しません。'
        );
      }

      return {
        ok:true,
        startIndex:ifIndex,
        condition:headerMatch[1].trim(),
        ifBodyStartIndex:ifIndex + 1,
        ifEndIndex:ifBranch.endIndex,
        ifNestedIfs:ifBranch.nestedIfs,
        hasElse:true,
        elseIndex,
        elseBodyStartIndex:elseIndex + 1,
        elseEndIndex:elseBranch.endIndex,
        elseNestedIfs:elseBranch.nestedIfs,
        combinedElseLine,
        endIndex:elseBranch.endIndex
      };
    }

    return parseIf(startIndex, 1, true);
  }

  function describeNestedIfBoundaries(node){
    if(!node.hasElse){
      addAnalysis(analysis, node.ifEndIndex + 1, '入れ子のif文の処理範囲の終わりです。外側の処理へ戻ります。');
      return;
    }

    if(node.combinedElseLine){
      addAnalysis(analysis, node.ifEndIndex + 1, '入れ子のif側の終わりと、else側の始まりです。');
    }else{
      addAnalysis(analysis, node.ifEndIndex + 1, '入れ子のif側の処理範囲の終わりです。');
      for(let gapIndex = node.ifEndIndex + 1; gapIndex < node.elseIndex; gapIndex++){
        processSimpleLine(lines[gapIndex], gapIndex, true);
      }
      addAnalysis(analysis, node.elseIndex + 1, '入れ子のif文の条件が成立しなかったときに実行する、else側の始まりです。');
    }

    addAnalysis(analysis, node.elseEndIndex + 1, '入れ子のif〜else文の処理範囲の終わりです。外側の処理へ戻ります。');
  }

  function executeNestedIf(node){
    const lineNo = node.startIndex + 1;
    const result = evaluateExpression(node.condition, variables);

    if(!result.ok){
      const skippedTarget = node.hasElse ? 'if側とelse側の処理' : '中の処理';
      addAnalysis(analysis, lineNo, `入れ子のif文の条件 <code>${escapeHtml(node.condition)}</code> を評価できませんでした。${skippedTarget}は実行せず、外側の処理へ戻ります。`);
      addHint(hints, lineNo, '入れ子のif文の条件を評価できません', escapeHtml(result.error));
      warningLines.add(lineNo);
      addStep(lineNo, `入れ子のif文の条件を評価できなかったため、${node.hasElse ? 'if側とelse側' : '中'}の処理は実行しません。外側の処理へ戻ります。`);
      markSkippedIfBody(
        node.ifBodyStartIndex,
        node.ifEndIndex,
        true,
        '入れ子のif文の条件を評価できなかったため、この行は実行されませんでした。'
      );
      if(node.hasElse){
        markSkippedIfBody(
          node.elseBodyStartIndex,
          node.elseEndIndex,
          true,
          '入れ子のif文の条件を評価できなかったため、else側のこの行は実行されませんでした。'
        );
      }
    }else{
      const conditionMet = result.value !== 0;
      const conditionExplanation = result.comparison
        ? describeComparison(result)
        : `${escapeHtml(result.readable)} を計算した結果は ${result.value} です。C言語では0以外を条件成立、0を条件不成立として扱います。`;
      const branchExplanation = node.hasElse
        ? (conditionMet
          ? '条件が成立したため、if側の処理を実行し、else側は実行しません。'
          : '条件が成立しなかったため、if側は実行せず、else側の処理を実行します。')
        : (conditionMet
          ? '条件が成立したため、中の処理を実行します。'
          : '条件が成立しなかったため、中の処理は実行しません。');
      addAnalysis(analysis, lineNo, `入れ子のif文の条件 <code>${escapeHtml(node.condition)}</code> を判定しました。${conditionExplanation}${branchExplanation}`);
      addStep(lineNo, `入れ子のif文の条件 ${escapeHtml(node.condition)} を判定しました。${branchExplanation}`);

      if(conditionMet){
        executeIfBranch(node.ifBodyStartIndex, node.ifEndIndex, node.ifNestedIfs);
        if(node.hasElse){
          markSkippedIfBody(
            node.elseBodyStartIndex,
            node.elseEndIndex,
            false,
            '入れ子のif文の条件が成立したため、else側のこの行は実行されませんでした。'
          );
        }
      }else{
        markSkippedIfBody(
          node.ifBodyStartIndex,
          node.ifEndIndex,
          false,
          '入れ子のif文の条件が成立しなかったため、この行は実行されませんでした。'
        );
        if(node.hasElse){
          executeIfBranch(node.elseBodyStartIndex, node.elseEndIndex, node.elseNestedIfs);
        }
      }
    }

    describeNestedIfBoundaries(node);
  }

  function executeIfBranch(startIndex, endIndex, nestedIfs){
    const nestedIfMap = new Map(nestedIfs.map(node => [node.startIndex, node]));
    for(let index = startIndex; index < endIndex; index++){
      const nestedIf = nestedIfMap.get(index);
      if(nestedIf){
        executeNestedIf(nestedIf);
        index = nestedIf.endIndex;
        continue;
      }
      processSimpleLine(lines[index], index, true);
    }
  }

  function markSkippedIfBranch(startIndex, endIndex, nestedIfs, reason, nestedReason){
    const nestedIfMap = new Map(nestedIfs.map(node => [node.startIndex, node]));
    for(let index = startIndex; index < endIndex; index++){
      const nestedIf = nestedIfMap.get(index);
      if(nestedIf){
        addAnalysis(analysis, nestedIf.startIndex + 1, nestedReason);
        markSkippedIfBody(nestedIf.ifBodyStartIndex, nestedIf.ifEndIndex, false, reason);
        if(nestedIf.hasElse){
          markSkippedIfBody(nestedIf.elseBodyStartIndex, nestedIf.elseEndIndex, false, reason);
        }
        describeNestedIfBoundaries(nestedIf);
        index = nestedIf.endIndex;
        continue;
      }
      markSkippedLine(index, reason);
    }
  }

  // 波かっこなしif文が制御する「1文」の終わりを探します。
  // 制御対象も波かっこなしif文なら、その内側の制御対象までたどります。
  function findControlledStatementEnd(startIndex){
    let statementIndex = startIndex;
    while(statementIndex < lines.length && executableLines[statementIndex].trim() === ''){
      statementIndex++;
    }
    if(statementIndex >= lines.length) return lines.length - 1;

    const structuralCode = codeOutsideStringAndLineComment(executableLines[statementIndex]).trim();
    const inlineBody = inlineIfBodyCode(structuralCode);
    if(structuralCode === '{' || inlineBody === '{'){
      return findIfBlock(statementIndex).endIndex;
    }

    if(/^if\s*\(/.test(structuralCode)){
      let trueEndIndex = statementIndex;
      if(inlineBody === ''){
        let controlledIndex = statementIndex + 1;
        while(controlledIndex < lines.length && executableLines[controlledIndex].trim() === ''){
          controlledIndex++;
        }
        const controlledCode = controlledIndex < lines.length
          ? codeOutsideStringAndLineComment(executableLines[controlledIndex]).trim()
          : '';
        if(controlledCode === '{') return findIfBlock(controlledIndex).endIndex;
        trueEndIndex = findControlledStatementEnd(statementIndex + 1);
      }
      let elseIndex = trueEndIndex + 1;
      while(elseIndex < lines.length && executableLines[elseIndex].trim() === ''){
        elseIndex++;
      }
      if(elseIndex >= lines.length) return trueEndIndex;

      const elseCode = codeOutsideStringAndLineComment(executableLines[elseIndex]).trim();
      if(!/^else\b/.test(elseCode)) return trueEndIndex;
      if(/^else\s+if\s*\(/.test(elseCode)){
        return findControlledIfEnd(elseIndex);
      }
      if(/^else\s*\{/.test(elseCode)) return findIfBlock(elseIndex).endIndex;
      if(elseCode.replace(/^else\b/, '').trim() !== '') return elseIndex;
      return findControlledStatementEnd(elseIndex + 1);
    }

    return statementIndex;
  }

  // else if の行をif文の開始行として扱い、後続のelseも含めて探します。
  function findControlledIfEnd(ifIndex, structuralCodeOverride = null){
    const structuralCode = structuralCodeOverride ?? codeOutsideStringAndLineComment(executableLines[ifIndex]).trim();
    const ifCode = structuralCode.replace(/^else\s+/, '');
    const inlineBody = inlineIfBodyCode(ifCode);
    if(inlineBody === '{') return findIfBlock(ifIndex).endIndex;

    let trueEndIndex = ifIndex;
    if(inlineBody === ''){
      let controlledIndex = ifIndex + 1;
      while(controlledIndex < lines.length && executableLines[controlledIndex].trim() === ''){
        controlledIndex++;
      }
      if(controlledIndex < lines.length &&
         codeOutsideStringAndLineComment(executableLines[controlledIndex]).trim() === '{'){
        return findIfBlock(controlledIndex).endIndex;
      }
      trueEndIndex = findControlledStatementEnd(ifIndex + 1);
    }
    let elseIndex = trueEndIndex + 1;
    while(elseIndex < lines.length && executableLines[elseIndex].trim() === ''){
      elseIndex++;
    }
    if(elseIndex >= lines.length) return trueEndIndex;

    const elseCode = codeOutsideStringAndLineComment(executableLines[elseIndex]).trim();
    if(!/^else\b/.test(elseCode)) return trueEndIndex;
    if(/^else\s+if\s*\(/.test(elseCode)) return findControlledIfEnd(elseIndex);
    if(/^else\s*\{/.test(elseCode)) return findIfBlock(elseIndex).endIndex;
    if(elseCode.replace(/^else\b/, '').trim() !== '') return elseIndex;
    return findControlledStatementEnd(elseIndex + 1);
  }

  // 未対応のelseが制御する1文またはブロックの終わりを探します。
  function findElseControlledStatementEnd(elseIndex){
    const structuralCode = codeOutsideStringAndLineComment(executableLines[elseIndex]).trim();
    const elsePosition = structuralCode.search(/\belse\b/);
    if(elsePosition < 0) return elseIndex;

    const elseCode = structuralCode.slice(elsePosition).trim();
    if(/^else\s+if\s*\(/.test(elseCode)){
      return findControlledIfEnd(elseIndex, elseCode);
    }

    const inlineBody = elseCode.replace(/^else\b/, '').trim();
    if(inlineBody.startsWith('{')){
      return findBracedUnsupportedBlock(elseIndex).endIndex;
    }
    if(inlineBody !== ''){
      if(unsupportedControlInfo(inlineBody)){
        return findUnsupportedControlRange(elseIndex, inlineBody).endIndex;
      }
      return elseIndex;
    }

    const bodyStartIndex = nextSignificantLine(elseIndex + 1);
    if(bodyStartIndex >= executionEndIndex) return elseIndex;
    return findUnsupportedControlledStatementEnd(bodyStartIndex);
  }

  function nextSignificantLine(startIndex){
    let index = startIndex;
    while(index < executionEndIndex && executableLines[index].trim() === ''){
      index++;
    }
    return index;
  }

  // 未対応構文の波かっこを数え、本文の終わりを安全側で特定します。
  function findBracedUnsupportedBlock(startIndex){
    let depth = 0;
    let opened = false;

    for(let index = startIndex; index < executionEndIndex; index++){
      for(const brace of bracesOutsideString(executableLines[index])){
        if(brace === '{'){
          depth++;
          opened = true;
        }else if(opened){
          depth--;
        }
      }
      if(opened && depth === 0) return { endIndex:index, closed:true };
    }

    return { endIndex:Math.max(startIndex, executionEndIndex - 1), closed:false };
  }

  function unsupportedControlInfo(structuralCode){
    if(/^for\s*\(/.test(structuralCode)) return { keyword:'for', label:'for文' };
    if(/^while\s*\(/.test(structuralCode)) return { keyword:'while', label:'while文' };
    if(/^switch\s*\(/.test(structuralCode)) return { keyword:'switch', label:'switch文' };
    if(/^do\b/.test(structuralCode)) return { keyword:'do', label:'do while文' };
    return null;
  }

  function findUnsupportedControlledStatementEnd(startIndex){
    if(startIndex >= executionEndIndex) return executionEndIndex - 1;

    const structuralCode = codeOutsideStringAndLineComment(executableLines[startIndex]).trim();
    if(unsupportedControlInfo(structuralCode)){
      return findUnsupportedControlRange(startIndex).endIndex;
    }
    if(/^if\s*\(/.test(structuralCode)) return findControlledStatementEnd(startIndex);
    if(structuralCode.startsWith('{')) return findBracedUnsupportedBlock(startIndex).endIndex;
    return startIndex;
  }

  function findUnsupportedControlRange(startIndex, structuralCodeOverride = null){
    const structuralCode = structuralCodeOverride ?? codeOutsideStringAndLineComment(executableLines[startIndex]).trim();
    const control = unsupportedControlInfo(structuralCode);
    if(!control) return { endIndex:startIndex, closed:true };

    if(control.keyword === 'do'){
      const inlineBody = structuralCode.replace(/^do\b/, '').trim();
      let bodyEndIndex = startIndex;
      let closed = true;

      if(inlineBody.startsWith('{')){
        const block = findBracedUnsupportedBlock(startIndex);
        bodyEndIndex = block.endIndex;
        closed = block.closed;
      }else if(inlineBody === ''){
        const bodyStartIndex = nextSignificantLine(startIndex + 1);
        if(bodyStartIndex < executionEndIndex){
          if(codeOutsideStringAndLineComment(executableLines[bodyStartIndex]).trim().startsWith('{')){
            const block = findBracedUnsupportedBlock(bodyStartIndex);
            bodyEndIndex = block.endIndex;
            closed = block.closed;
          }else{
            bodyEndIndex = findUnsupportedControlledStatementEnd(bodyStartIndex);
          }
        }
      }

      const terminatorIndex = nextSignificantLine(bodyEndIndex + 1);
      if(terminatorIndex < executionEndIndex){
        const terminatorCode = codeOutsideStringAndLineComment(executableLines[terminatorIndex]).trim();
        if(/^while\s*\(/.test(terminatorCode) && inlineUnsupportedControlBodyCode(terminatorCode) === ';'){
          bodyEndIndex = terminatorIndex;
        }
      }

      return { endIndex:bodyEndIndex, closed };
    }

    if(bracesOutsideString(executableLines[startIndex]).includes('{')){
      return findBracedUnsupportedBlock(startIndex);
    }

    const inlineBody = inlineUnsupportedControlBodyCode(structuralCode);
    if(inlineBody && inlineBody !== ';'){
      if(inlineBody.startsWith('{')) return findBracedUnsupportedBlock(startIndex);
      return { endIndex:startIndex, closed:true };
    }
    if(inlineBody === ';') return { endIndex:startIndex, closed:true };

    const bodyStartIndex = nextSignificantLine(startIndex + 1);
    if(bodyStartIndex >= executionEndIndex) return { endIndex:startIndex, closed:false };

    const bodyCode = codeOutsideStringAndLineComment(executableLines[bodyStartIndex]).trim();
    if(bodyCode.startsWith('{')) return findBracedUnsupportedBlock(bodyStartIndex);
    return { endIndex:findUnsupportedControlledStatementEnd(bodyStartIndex), closed:true };
  }

  function warnUnsupportedControl(startIndex, range, control){
    const lineNo = startIndex + 1;
    const message = `${control.label}は現在未対応です。制御対象の処理全体は実行しません。`;
    addAnalysis(analysis, lineNo, message);
    addHint(hints, lineNo, `${control.label}は未対応`, message);
    warningLines.add(lineNo);
    addSkippedLineWarnings(startIndex, executableLines[startIndex].trim());

    for(let index = startIndex + 1; index <= range.endIndex && index < executionEndIndex; index++){
      const trimmed = executableLines[index].trim();
      if(trimmed === ''){
        processSimpleLine(lines[index], index, true);
      }else{
        addAnalysis(analysis, index + 1, `未対応の${control.label}に含まれるため、この行は実行されませんでした。`);
        addSkippedLineWarnings(index, trimmed);
      }
    }

    if(!range.closed){
      addHint(hints, lineNo, '制御構文の終わりを確認', `${control.label}の処理範囲を最後まで確認できないため、以降の実行を安全側で停止しました。`);
    }
  }

  // for全体を初期化前に検査し、Stage1で安全に実行できる本体だけを受け付けます。
  function inspectSupportedFor(startIndex){
    const range = findUnsupportedControlRange(startIndex);
    const safeEndIndex = Math.min(range.endIndex, Math.max(startIndex, executionEndIndex - 1));
    const structuralCode = codeOutsideStringAndLineComment(executableLines[startIndex]).trim();
    const header = parseForHeader(structuralCode);

    function failure(message, title = 'for文は未対応'){
      return {
        ok:false,
        title,
        message,
        endIndex:safeEndIndex,
        closed:range.closed
      };
    }

    if(!header.ok){
      return failure(`${header.error} C言語として正しい形であっても、現在のVisualizerの対応範囲外である場合は実行しません。`);
    }
    if(!range.closed){
      return failure('for文を閉じる波かっこを確認できないため、初期化を含めて実行しません。', 'for文の終わりを確認');
    }

    for(let index = startIndex + 1; index < safeEndIndex; index++){
      const trimmed = executableLines[index].trim();
      const structuralBodyCode = codeOutsideStringAndLineComment(executableLines[index]).trim();
      if(structuralBodyCode === '') continue;

      if(hasMultipleStatementsOnOneLine(trimmed)){
        return failure('for文の本体に1行で複数の文が書かれています。本体を部分実行せず、この地点で停止します。', 'for文本体の改行を確認');
      }
      if(/^scanf\b/.test(structuralBodyCode) || /\bscanf\s*\(/.test(structuralBodyCode)){
        return failure('for文の本体内にscanfがあります。Stage1ではfor内scanfに対応していないため、for文全体を実行しません。', 'for文内のscanfは未対応');
      }
      if(/^if\b/.test(structuralBodyCode)){
        return failure('for文の本体内にif文があります。Stage1ではfor + ifに対応していないため、for文全体を実行しません。', 'for文内のifは未対応');
      }

      const nestedControl = unsupportedControlInfo(structuralBodyCode);
      if(nestedControl){
        return failure(`for文の本体内に${nestedControl.label}があります。Stage1では制御構造の入れ子に対応していないため、for文全体を実行しません。`, 'for文内の制御構造は未対応');
      }
      if(/^do\b|^else\b/.test(structuralBodyCode) || bracesOutsideString(executableLines[index]).length > 0){
        return failure('for文の本体内に、Stage1では実行できないブロック構造があります。for文全体を実行しません。', 'for文内のブロックは未対応');
      }
      if(/^int\b/.test(structuralBodyCode)){
        return failure('for文の本体内で変数を宣言する形はStage1では未対応です。for文全体を実行しません。', 'for文内の変数宣言は未対応');
      }

      const variableUpdate = parseVariableUpdate(structuralBodyCode, true);
      if(/\+\+|--/.test(structuralBodyCode) && variableUpdate === null){
        return failure('for文の本体に、式中で副作用を利用する++ / --があります。Stage1では単独更新文だけに対応しているため、for文全体を実行しません。', '式中の++・--は未対応');
      }

      const looksLikePrintf = /^printf\b/.test(structuralBodyCode);
      const printfMatch = looksLikePrintf ? matchSimplePrintfStatement(trimmed) : null;
      if(looksLikePrintf && (!printfMatch || printfMatch[1].includes('%%'))){
        return failure('for文の本体に、既存の単純printfとして安全に実行できない文があります。for文全体を実行しません。', 'for文本体のprintfは未対応');
      }

      const supportedSimpleStatement =
        /^return\s+0\s*;?$/.test(structuralBodyCode) ||
        variableUpdate !== null ||
        /^[A-Za-z_]\w*\s*=\s*.+;$/.test(structuralBodyCode) ||
        printfMatch !== null;
      if(!supportedSimpleStatement){
        return failure('for文の本体に、Stage1では実行できない文があります。本体を部分実行せず、この地点で停止します。', 'for文本体の文は未対応');
      }
    }

    return {
      ok:true,
      ...header,
      startIndex,
      bodyStartIndex:startIndex + 1,
      bodyEndIndex:safeEndIndex,
      endIndex:safeEndIndex
    };
  }

  function warnUnsupportedFor(startIndex, inspection){
    const lineNo = startIndex + 1;
    addAnalysis(analysis, lineNo, `${inspection.message} for文の初期化・条件・本体・更新は実行していません。`);
    addHint(hints, lineNo, inspection.title, inspection.message);
    warningLines.add(lineNo);
    addStep(lineNo, 'このfor文は現在のVisualizerでは実行できないため、プログラムの実行を停止します。', false);

    for(let index = startIndex + 1; index <= inspection.endIndex && index < executionEndIndex; index++){
      const trimmed = executableLines[index].trim();
      if(trimmed === ''){
        processSimpleLine(lines[index], index, false, true);
      }else{
        addAnalysis(analysis, index + 1, '未対応のfor文に含まれるため、この行は実行されませんでした。');
        addSkippedLineWarnings(index, trimmed);
      }
    }
  }

  function executeFor(node){
    const lineNo = node.startIndex + 1;
    const initialization = executeAssignment(
      node.initialization.name,
      node.initialization.expression,
      lineNo,
      'for文の初期化'
    );
    if(!initialization.ok){
      addStep(lineNo, 'for文の初期化を実行できないため、プログラムの実行を停止します。');
      return {
        status:'execution-stopped',
        stopIndex:node.startIndex,
        reason:'for文の初期化で実行を停止したため、この行は実行されませんでした。'
      };
    }

    let iterationCount = 0;
    while(true){
      const conditionResult = evaluateExpression(node.condition, variables);
      if(!conditionResult.ok){
        addAnalysis(analysis, lineNo, `for文の条件 <code>${escapeHtml(node.condition)}</code> を評価できませんでした。`);
        addHint(hints, lineNo, 'for文の条件を評価できません', escapeHtml(conditionResult.error));
        warningLines.add(lineNo);
        addStep(lineNo, 'for文の条件を評価できないため、プログラムの実行を停止します。');
        return {
          status:'execution-stopped',
          stopIndex:node.startIndex,
          reason:'for文の条件評価で実行を停止したため、この行は実行されませんでした。'
        };
      }

      const conditionMet = conditionResult.value !== 0;
      const conditionExplanation = conditionResult.comparison
        ? describeComparison(conditionResult)
        : `${escapeHtml(conditionResult.readable)} を計算した結果は ${conditionResult.value} です。C言語では0以外を条件成立、0を条件不成立として扱います。`;
      const nextAction = conditionMet
        ? '条件が成立したため、for文の本体へ進みます。'
        : '条件が成立しなかったため、for文を終了します。';
      addAnalysis(analysis, lineNo, `<strong>for文の条件：</strong> ${conditionExplanation}${nextAction}`);
      addStep(lineNo, `for文の条件 ${escapeHtml(node.condition)} を判定しました。<br>${nextAction}`);

      if(!conditionMet){
        addAnalysis(analysis, node.endIndex + 1, 'for文の処理範囲の終わりです。後続の処理へ進みます。');
        addStep(lineNo, 'for文の最終条件が成立しなかったため、for文を終了します。');
        return { status:'normal' };
      }

      // 500回目までは実行し、501回目の本体へ入る直前に停止します。
      if(iterationCount >= MAX_FOR_ITERATIONS){
        const nextIterationNumber = MAX_FOR_ITERATIONS + 1;
        const safetyMessage = '無限ループ、または非常に多い反復の可能性があります。安全のため実行を停止しました。for文の「条件」と「更新式」を確認してみましょう。<strong>変数の値は、終了条件へ近づいていますか？</strong>';
        addAnalysis(analysis, lineNo, `繰り返し回数が安全上限の ${MAX_FOR_ITERATIONS} 回に達したため、次の本体へ入らず停止しました。`);
        addHint(hints, lineNo, '繰り返し回数が安全上限に達しました', safetyMessage);
        warningLines.add(lineNo);
        addStep(lineNo, `for文は ${MAX_FOR_ITERATIONS} 回反復しました。${nextIterationNumber}回目の本体へ入る前に、安全のためプログラムの実行を停止します。`);
        addAnalysis(analysis, node.endIndex + 1, 'for文が安全上限で停止したため、後続の処理へは進みません。');
        return {
          status:'execution-stopped',
          stopIndex:node.endIndex,
          reason:'for文が安全上限で停止したため、この行は実行されませんでした。'
        };
      }

      iterationCount++;
      for(let index = node.bodyStartIndex; index < node.bodyEndIndex; index++){
        // 空行とコメントは最初の反復で一度だけ説明し、同じ説明の大量重複を避けます。
        if(executableLines[index].trim() === '' && iterationCount > 1) continue;

        const bodyResult = processSimpleLine(lines[index], index, false, true);
        if(bodyResult === 'program-ended'){
          return { status:'program-ended', stopIndex:index };
        }
        if(bodyResult === 'execution-error' || bodyResult === 'scanf-error'){
          addStep(index + 1, 'for文の本体で処理を継続できないため、プログラムの実行を停止します。');
          return {
            status:'execution-stopped',
            stopIndex:index,
            reason:'for文の本体で実行を停止したため、この行は実行されませんでした。'
          };
        }
      }

      let updateResult;
      if(node.update.type === 'variable-update'){
        updateResult = executeVariableUpdate(node.update.value, lineNo, 'for文の更新');
      }else{
        updateResult = executeAssignment(
          node.update.name,
          node.update.expression,
          lineNo,
          'for文の更新'
        );
      }
      if(!updateResult.ok){
        addStep(lineNo, 'for文の更新を実行できないため、プログラムの実行を停止します。');
        addAnalysis(analysis, node.endIndex + 1, 'for文の更新で実行を停止したため、後続の処理へは進みません。');
        return {
          status:'execution-stopped',
          stopIndex:node.endIndex,
          reason:'for文の更新で実行を停止したため、この行は実行されませんでした。'
        };
      }
    }
  }

  // main関数の外側は説明だけを付け、実行処理には渡しません。
  for(let index = 0; index < lines.length; index++){
    if(mainRange?.closed && index > mainRange.startIndex && index < mainRange.endIndex) continue;

    if(mainRange && index === mainRange.startIndex){
      processSimpleLine(lines[index], index);
      if(!mainRange.closed){
        addAnalysis(analysis, index + 1, 'main関数の終わりを確認できないため、中のコードは実行しません。');
      }
      continue;
    }

    if(mainRange?.closed && index === mainRange.endIndex){
      addAnalysis(analysis, index + 1, 'main関数の処理範囲の終わりです。');
      continue;
    }

    const reason = mainRange?.closed
      ? 'main関数の外側なので、この行は実行対象にしません。'
      : 'main関数の処理範囲を確認できないため、この行は実行しません。';
    describeNonExecutableLine(lines[index], index, reason);
  }

  let programEndIndex = null;
  let scanfStopIndex = null;
  let executionStop = null;
  const executionStartIndex = mainRange?.closed ? mainRange.startIndex + 1 : 0;
  const executionEndIndex = mainRange?.closed ? mainRange.endIndex : 0;

  for(let index = executionStartIndex; index < executionEndIndex; index++){
    const trimmed = executableLines[index].trim();
    const structuralCode = codeOutsideStringAndLineComment(executableLines[index]).trim();

    if(/^for\b/.test(structuralCode)){
      const forNode = inspectSupportedFor(index);
      if(!forNode.ok){
        warnUnsupportedFor(index, forNode);
        executionStop = {
          index:forNode.endIndex,
          reason:'未対応のfor文で実行を停止したため、この行は実行されませんでした。'
        };
        break;
      }

      const forResult = executeFor(forNode);
      if(forResult.status === 'program-ended'){
        programEndIndex = forResult.stopIndex;
        break;
      }
      if(forResult.status === 'execution-stopped'){
        executionStop = {
          index:forResult.stopIndex,
          reason:forResult.reason
        };
        break;
      }

      index = forNode.endIndex;
      continue;
    }

    const unsupportedControl = unsupportedControlInfo(structuralCode);
    if(unsupportedControl){
      const range = findUnsupportedControlRange(index);
      warnUnsupportedControl(index, range, unsupportedControl);
      index = range.endIndex;
      continue;
    }

    if(!/^if\s*\(/.test(structuralCode)){
      const result = processSimpleLine(lines[index], index);
      if(result === 'program-ended'){
        programEndIndex = index;
        break;
      }
      if(result === 'scanf-error'){
        scanfStopIndex = index;
        break;
      }
      continue;
    }

    const headerMatch = structuralCode.match(/^if\s*\((.*)\)\s*\{$/);
    if(!headerMatch){
      let skippedIndex = index + 1;
      while(skippedIndex < lines.length && executableLines[skippedIndex].trim() === ''){
        skippedIndex++;
      }
      const nextStructuralCode = skippedIndex < lines.length
        ? codeOutsideStringAndLineComment(executableLines[skippedIndex]).trim()
        : '';
      if(nextStructuralCode === '{'){
        const detachedBlock = findIfBlock(skippedIndex);
        warnUnsupportedIf(index, detachedBlock.endIndex, '次の行に開き波かっこを書くif文は未対応', '開き波かっこを次の行に書くif文は現在未対応です。このif文の処理全体は実行しません。');
        index = detachedBlock.endIndex;
      }else{
        const controlledEndIndex = findControlledStatementEnd(index + 1);
        warnUnsupportedIf(index, controlledEndIndex, '波かっこなしif文は未対応', '波かっこを省略したif文は現在未対応です。直後の文も実行しません。');
        index = Math.min(controlledEndIndex, lines.length - 1);
      }
      continue;
    }

    const block = inspectSupportedOuterIf(index);
    if(!block.ok){
      warnUnsupportedIf(index, block.endIndex, block.title, block.message);
      index = block.endIndex;
      continue;
    }

    const lineNo = index + 1;
    const condition = block.condition;
    const result = evaluateExpression(condition, variables);
    const wholeEndIndex = block.endIndex;
    if(!result.ok){
      const skippedTarget = block.hasElse ? 'if側とelse側' : '波かっこの中';
      addAnalysis(analysis, lineNo, `if文の条件 <code>${escapeHtml(condition)}</code> を評価できませんでした。${skippedTarget}の処理は実行しません。`);
      addHint(hints, lineNo, 'if文の条件を評価できません', escapeHtml(result.error));
      warningLines.add(lineNo);
      addStep(lineNo, `if文の条件を評価できなかったため、${block.hasElse ? 'if側とelse側' : '中'}の処理は実行しません。`);
      markSkippedIfBranch(
        block.ifBodyStartIndex,
        block.ifEndIndex,
        block.ifNestedIfs,
        'if文の条件を評価できなかったため、この行は実行されませんでした。',
        '外側のif文の条件を評価できなかったため、この入れ子のif文は評価されませんでした。'
      );
      if(block.hasElse){
        markSkippedIfBranch(
          block.elseBodyStartIndex,
          block.elseEndIndex,
          block.elseNestedIfs,
          'if文の条件を評価できなかったため、else文の中も実行されませんでした。',
          '外側のif文の条件を評価できなかったため、else側の入れ子のif文は評価されませんでした。'
        );
      }
    }else{
      const conditionMet = result.value !== 0;
      const conditionExplanation = result.comparison
        ? describeComparison(result)
        : `${escapeHtml(result.readable)} を計算した結果は ${result.value} です。C言語では0以外を条件成立、0を条件不成立として扱います。`;
      const branchExplanation = block.hasElse
        ? (conditionMet
          ? 'if側の処理を実行し、else側は実行しません。'
          : 'if側は実行せず、else側の処理を実行します。')
        : (conditionMet ? '波かっこの中の処理を実行します。' : '波かっこの中の処理は実行しません。');
      addAnalysis(analysis, lineNo, `${conditionExplanation}${branchExplanation}`);
      const stepExplanation = block.hasElse
        ? (conditionMet
          ? '条件が成立したため、if文の中へ進みます。else文の中は実行しません。'
          : '条件が成立しなかったため、if文の中は実行せず、else文の中へ進みます。')
        : (conditionMet ? '条件が成立したため、if文の中へ進みます。' : '条件が成立しなかったため、if文の中は実行しません。');
      addStep(lineNo, `${escapeHtml(condition)}を判定しました。<br>${stepExplanation}`);
      if(conditionMet){
        executeIfBranch(block.ifBodyStartIndex, block.ifEndIndex, block.ifNestedIfs);
        if(block.hasElse){
          markSkippedIfBranch(
            block.elseBodyStartIndex,
            block.elseEndIndex,
            block.elseNestedIfs,
            'if文の条件が成立したため、else文の中は実行されませんでした。',
            '外側の分岐が選択されなかったため、この入れ子のif文は評価されませんでした。'
          );
        }
      }else{
        markSkippedIfBranch(
          block.ifBodyStartIndex,
          block.ifEndIndex,
          block.ifNestedIfs,
          'if文の条件が成立しなかったため、この行は実行されませんでした。',
          '外側の分岐が選択されなかったため、この入れ子のif文は評価されませんでした。'
        );
        if(block.hasElse){
          executeIfBranch(block.elseBodyStartIndex, block.elseEndIndex, block.elseNestedIfs);
        }
      }
    }

    if(block.hasElse){
      if(block.combinedElseLine){
        addAnalysis(analysis, block.ifEndIndex + 1, 'if側の終わりと、else側の始まりです。');
      }else{
        addAnalysis(analysis, block.ifEndIndex + 1, 'if側の処理範囲の終わりです。');
        for(let gapIndex = block.ifEndIndex + 1; gapIndex < block.elseIndex; gapIndex++){
          processSimpleLine(lines[gapIndex], gapIndex, true);
        }
        addAnalysis(analysis, block.elseIndex + 1, 'if文の条件が成立しなかったときに実行する、else側の始まりです。');
      }
      addAnalysis(analysis, block.elseEndIndex + 1, 'if〜else文の処理範囲の終わりです。');
    }else{
      addAnalysis(analysis, block.endIndex + 1, 'if文の処理範囲の終わりです。');
    }
    index = wholeEndIndex;
  }

  if(programEndIndex !== null){
    for(let index = programEndIndex + 1; index < executionEndIndex; index++){
      addAnalysis(analysis, index + 1, 'プログラムが終了した後なので、この行は実行されませんでした。');
    }
  }

  if(scanfStopIndex !== null){
    for(let index = scanfStopIndex + 1; index < executionEndIndex; index++){
      addAnalysis(analysis, index + 1, 'scanfで実行を停止したため、この行は実行されませんでした。');
    }
  }

  if(executionStop !== null){
    for(let index = executionStop.index + 1; index < executionEndIndex; index++){
      addAnalysis(analysis, index + 1, executionStop.reason);
    }
  }

  if(!hasMain){
    addHint(hints, null, 'main関数が見当たりません', '学習用の基本的なCプログラムでは、<code>int main(void)</code> などの開始地点を書くことが多いです。');
  }

  if(!hasReturn && !hasReturnInMain){
    addHint(hints, null, 'return 0; が見当たりません', '学習用の基本形として、最後に <code>return 0;</code> を書く形も確認しておきましょう。');
  }

  if(mainRange && !mainRange.closed){
    addHint(hints, mainRange.startIndex + 1, 'main関数の終わりを確認', 'main関数を閉じる波かっこが見つからないため、コードの実行を停止しました。');
  }

  if(braceBalance !== 0){
    addHint(hints, null, '波かっこの数を確認', '<code>{</code> と <code>}</code> の数が対応していない可能性があります。処理のまとまりの始まりと終わりを追ってみましょう。');
  }

  const previewHtml = lines.map((line, index) => {
    const lineNo = index + 1;
    const classes = [
      executedLines.has(lineNo) ? 'executed-line' : '',
      warningLines.has(lineNo) ? 'warning-highlight' : ''
    ].filter(Boolean).join(' ');
    const safeText = escapeHtml(line) || '&nbsp;';
    const lineAnalysis = analysis[lineNo] || [];
    const analysisHtml = lineAnalysis.length
      ? `<div class="line-analysis">${lineAnalysis.map(text => `<div class="line-analysis-item">${text}</div>`).join('')}</div>`
      : `<div class="line-analysis line-analysis-empty">この行の説明はまだありません。</div>`;

    return `
      <div class="code-card ${classes}">
        <div class="code-line">
          <div class="code-line-number">${lineNo}</div>
          <div class="code-line-text">${safeText}</div>
        </div>
        ${analysisHtml}
      </div>
    `;
  }).join('');

  const variableHtml = variableOrder.length
    ? variableOrder.map(name => {
      const value = variables[name] === UNINITIALIZED ? '未初期化' : String(variables[name]);
      return `<div class="variable-chip">${escapeHtml(name)} = ${escapeHtml(value)}</div>`;
    }).join('')
    : `<div class="note">変数の状態はまだありません。</div>`;

  const stepHtml = steps.length
    ? steps.map(item => `<div class="step-card"><strong>STEP ${item.step}</strong> <span class="dim">${item.lineNo}行目</span><br>${item.text}</div>`).join('')
    : `<div class="note">まだ実行できるステップはありません。</div>`;

  document.getElementById('outputResult').textContent = output || '出力はまだありません。';
  document.getElementById('variableState').innerHTML = variableHtml;
  document.getElementById('stepResult').innerHTML = stepHtml;
  document.getElementById('codePreview').innerHTML = previewHtml;
  document.getElementById('hintResult').innerHTML = hints.length
    ? hints.join('') + `<div class="hint"><b>見方のコツ</b><br>このツールは答えを出すためではなく、<span class="highlight">変数の中身がいつ・なぜ変わるか</span>を見るためのものです。まずはSTEPと変数チップを対応させて読んでみましょう。</div>`
    : `<div class="hint"><b>大きなミスは見つかっていません。</b><br>次は、各STEPを自分の言葉で説明できるか試してみましょう。</div>`;
}

initializeCodeEditor();
visualizeCode();
