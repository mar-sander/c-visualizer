const samples = {
  basic: `#include <stdio.h>\n\nint main(void){\n    int a = 3;\n    int b = 5;\n    int c = a + b;\n    printf("%d\\n", c);\n    return 0;\n}`,
  calcSimple: `#include <stdio.h>\n\nint main(void){\n    int price = 120;\n    int count = 3;\n    int total = price * count;\n    printf("%d円です\\n", total);\n    return 0;\n}`,
  calc: `#include <stdio.h>\n\nint main(void){\n    int price = 120;\n    int count = 4;\n    int total = price * count;\n    int change = 1000 - total;\n    printf("合計:%d円\\n", total);\n    printf("おつり:%d円\\n", change);\n    return 0;\n}`,
  assign: `#include <stdio.h>\n\nint main(void){\n    int score = 60;\n    score = score + 15;\n    printf("%d\\n", score);\n    return 0;\n}`,
  ifSimple: `#include <stdio.h>\n\nint main(void){\n    int score = 78;\n    if(score >= 60){\n        printf("合格です\\n");\n    }\n    return 0;\n}`,
  unsupported: `#include <stdio.h>\n\nint main(void){\n    int score;\n    scanf("%d", &score);\n    return 0;\n}`
};

// 数値の 0 と区別して、まだ値が入っていない状態を表します。
const UNINITIALIZED = Symbol('uninitialized');

function escapeHtml(str){
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resetCode(){
  document.getElementById('codeInput').value = '';
  document.getElementById('outputResult').textContent = '';
  document.getElementById('variableState').innerHTML = '';
  document.getElementById('stepResult').innerHTML = '';
  document.getElementById('codePreview').innerHTML = '';
  document.getElementById('hintResult').innerHTML = '';
}

function loadSample(type){
  document.getElementById('codeInput').value = samples[type] || '';
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

function isCommentLine(trimmed){
  return trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('*/');
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

function bracesOutsideString(text){
  return [...codeOutsideStringAndLineComment(text)].filter(ch => ch === '{' || ch === '}');
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

function visualizeCode(){
  const code = document.getElementById('codeInput').value.replace(/\r\n/g, '\n');
  const lines = code.split('\n');
  const analysis = {};
  const hints = [];
  const executedLines = new Set();
  const warningLines = new Set();
  const variables = {};
  const variableOrder = [];
  const steps = [];
  let output = '';
  let braceBalance = 0;
  let hasMain = false;
  let hasReturn = false;
  let stepNo = 1;

  for(const rawLine of lines){
    for(const ch of bracesOutsideString(rawLine)){
      if(ch === '{') braceBalance++;
      if(ch === '}') braceBalance--;
    }
  }

  function rememberVariable(name, value){
    if(!(name in variables)) variableOrder.push(name);
    variables[name] = value;
  }

  function addStep(lineNo, text){
    steps.push({ step:stepNo++, lineNo, text });
    executedLines.add(lineNo);
  }

  function processSimpleLine(rawLine, index, insideIf = false){
    const lineNo = index + 1;
    const trimmed = rawLine.trim();

    if(trimmed === ''){
      addAnalysis(analysis, lineNo, '空欄です。処理は行いません。');
      return;
    }

    if(isCommentLine(trimmed)){
      addAnalysis(analysis, lineNo, 'コメントです。プログラムの動作には直接関係しません。');
      return;
    }

    if(insideIf && !/^int\s+/.test(trimmed) &&
       !/^[A-Za-z_]\w*\s*=/.test(trimmed) && !/^printf\s*\(/.test(trimmed)){
      addAnalysis(analysis, lineNo, 'この処理はif文の中では現在未対応のため、実行しません。');
      addHint(hints, lineNo, 'if文内では未対応', 'if文の中では、既存の変数への代入とprintfだけを実行できます。');
      warningLines.add(lineNo);
      return;
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
      return;
    }

    if(/^if\s*\(/.test(trimmed) || /^for\s*\(/.test(trimmed) || /^while\s*\(/.test(trimmed) || /^scanf\s*\(/.test(trimmed)){
      addAnalysis(analysis, lineNo, 'Ver.0.2_0730では未対応の構文です。今後の拡張対象として扱います。');
      addHint(hints, lineNo, 'Ver.0.2_0730では未対応', '現在は int、代入、整数の四則演算、比較式、printf、単純なif文の処理過程可視化に対応しています。この行は正確には実行シミュレートしていません。');
      warningLines.add(lineNo);
      return;
    }

    if(hasMultipleStatementsOnOneLine(trimmed)){
      const message = '1行に複数の文があります。文の終わりで改行してください。';
      addAnalysis(analysis, lineNo, message);
      addHint(hints, lineNo, '改行の確認', message);
      warningLines.add(lineNo);
      return;
    }

    const declMatch = trimmed.match(/^int\s+([A-Za-z_]\w*)\s*(?:=\s*(.+))?;$/);
    if(declMatch){
      if(insideIf){
        addAnalysis(analysis, lineNo, 'if文の中で新しい変数を宣言する処理は、現在未対応です。この行は実行しません。');
        addHint(hints, lineNo, 'if文内の変数宣言は未対応', 'ブロックスコープを正確に再現できないため、変数は登録しません。');
        warningLines.add(lineNo);
        return;
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
      if(!(name in variables)){
        addAnalysis(analysis, lineNo, `変数 <code>${name}</code> に代入しようとしています。`);
        addHint(hints, lineNo, '宣言前の代入かも', `変数 <code>${name}</code> が先に <code>int ${name};</code> のように宣言されているか確認してみましょう。`);
        warningLines.add(lineNo);
        return;
      }
      const result = evaluateExpression(expr, variables);
      if(result.ok){
        const before = variables[name];
        rememberVariable(name, result.value);
        if(result.comparison){
          const cValue = result.comparison.conditionMet ? '成立を1' : '不成立を0';
          addAnalysis(analysis, lineNo, `${describeComparison(result)} C言語では条件の${cValue}として扱うため、<code>${name}</code> に <code>${result.value}</code> を代入しました。`);
        }else{
          addAnalysis(analysis, lineNo, `変数 <code>${name}</code> に、<code>${escapeHtml(expr)}</code> の計算結果 <code>${result.value}</code> を代入しました。`);
        }
        if(before === UNINITIALIZED){
          addStep(lineNo, `${name} の中身に ${result.value} を代入しました。計算：${escapeHtml(result.readable)} = ${result.value}`);
        }else{
          addStep(lineNo, `${name} の中身を ${before} から ${result.value} に変えました。計算：${escapeHtml(result.readable)} = ${result.value}`);
        }
      }else{
        addAnalysis(analysis, lineNo, `変数 <code>${name}</code> への代入を読み取ろうとしましたが、式を計算できませんでした。`);
        addHint(hints, lineNo, '式を計算できません', escapeHtml(result.error));
        warningLines.add(lineNo);
      }
      return;
    }

    const printfMatch = trimmed.match(/^printf\s*\(\s*"((?:\\.|[^"\\])*)"\s*(?:,\s*(.*))?\)\s*;$/);
    if(printfMatch){
      const format = printfMatch[1];
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
      }
      return;
    }

    if(shouldProbablyEndWithSemicolon(trimmed)){
      addHint(hints, lineNo, 'セミコロンの不足かも', '文末に <code>;</code> が必要な可能性があります。直前の行も含めて見直してみましょう。');
      warningLines.add(lineNo);
    }

    addAnalysis(analysis, lineNo, 'Ver.0.2_0730では説明未対応のコードです。');
    if(trimmed !== ''){
      addHint(hints, lineNo, '未対応コード', 'この行は現在の可視化対象外です。まずは int、代入、整数の四則演算、比較式、printf、単純なif文の範囲で試してみましょう。');
      warningLines.add(lineNo);
    }
  }

  function markSkippedIfBody(startIndex, endIndex, evaluationFailed){
    const reason = evaluationFailed
      ? 'if文の条件を評価できなかったため、この行は実行されませんでした。'
      : 'if文の条件が成立しなかったため、この行は実行されませんでした。';
    for(let bodyIndex = startIndex; bodyIndex < endIndex; bodyIndex++){
      const trimmed = lines[bodyIndex].trim();
      if(trimmed === '' || isCommentLine(trimmed)){
        processSimpleLine(lines[bodyIndex], bodyIndex, true);
        continue;
      }
      addSkippedLineWarnings(bodyIndex, trimmed);
      if(/^int\s+/.test(trimmed)){
        addAnalysis(analysis, bodyIndex + 1, `${reason} また、if文の中で新しい変数を宣言する処理は現在未対応です。`);
        addHint(hints, bodyIndex + 1, 'if文内の変数宣言は未対応', 'ブロックスコープを正確に再現できないため、変数は登録しません。');
        warningLines.add(bodyIndex + 1);
      }else{
        addAnalysis(analysis, bodyIndex + 1, reason);
      }
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
      const trimmed = lines[index].trim();
      if(trimmed === '' || isCommentLine(trimmed)){
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
      const trimmed = lines[index].trim();
      const structuralCode = codeOutsideStringAndLineComment(trimmed);
      if(index > startIndex && /^\s*if\s*\(/.test(structuralCode)) nested = true;
      if(/\belse\b/.test(structuralCode)) hasElse = true;
      if(index > startIndex && /^\s*(for|while|switch)\s*\(/.test(structuralCode)) unsupportedBlock = true;
      const structuralBraces = bracesOutsideString(trimmed);
      if(index > startIndex && structuralBraces.includes('{')) unsupportedBlock = true;
      for(const brace of structuralBraces){
        depth += brace === '{' ? 1 : -1;
      }

      if(depth === 0 && index >= startIndex){
        let next = index + 1;
        while(next < lines.length && (lines[next].trim() === '' || isCommentLine(lines[next].trim()))) next++;
        if(next < lines.length && /^else\b/.test(lines[next].trim())){
          hasElse = true;
          index = next - 1;
          continue;
        }
        if(/^\s*else\b/.test(structuralCode) && next < lines.length &&
           codeOutsideStringAndLineComment(lines[next]).trim() === '{'){
          index = next - 1;
          continue;
        }
        return { endIndex:index, nested, unsupportedBlock, hasElse, closed:lines[index].trim() === '}' };
      }
    }
    return { endIndex:lines.length - 1, nested, unsupportedBlock, hasElse, closed:false };
  }

  // 波かっこなしif文が制御する「1文」の終わりを探します。
  // 制御対象も波かっこなしif文なら、その内側の制御対象までたどります。
  function findControlledStatementEnd(startIndex){
    let statementIndex = startIndex;
    while(statementIndex < lines.length &&
          (lines[statementIndex].trim() === '' || isCommentLine(lines[statementIndex].trim()))){
      statementIndex++;
    }
    if(statementIndex >= lines.length) return lines.length - 1;

    const structuralCode = codeOutsideStringAndLineComment(lines[statementIndex]).trim();
    const inlineBody = inlineIfBodyCode(structuralCode);
    if(structuralCode === '{' || inlineBody === '{'){
      return findIfBlock(statementIndex).endIndex;
    }

    if(/^if\s*\(/.test(structuralCode)){
      let trueEndIndex = statementIndex;
      if(inlineBody === ''){
        let controlledIndex = statementIndex + 1;
        while(controlledIndex < lines.length &&
              (lines[controlledIndex].trim() === '' || isCommentLine(lines[controlledIndex].trim()))){
          controlledIndex++;
        }
        const controlledCode = controlledIndex < lines.length
          ? codeOutsideStringAndLineComment(lines[controlledIndex]).trim()
          : '';
        if(controlledCode === '{') return findIfBlock(controlledIndex).endIndex;
        trueEndIndex = findControlledStatementEnd(statementIndex + 1);
      }
      let elseIndex = trueEndIndex + 1;
      while(elseIndex < lines.length &&
            (lines[elseIndex].trim() === '' || isCommentLine(lines[elseIndex].trim()))){
        elseIndex++;
      }
      if(elseIndex >= lines.length) return trueEndIndex;

      const elseCode = codeOutsideStringAndLineComment(lines[elseIndex]).trim();
      if(!/^else\b/.test(elseCode)) return trueEndIndex;
      if(/^else\s+if\s*\(/.test(elseCode)){
        return findControlledIfEnd(elseIndex);
      }
      if(/^else\s*\{/.test(elseCode)) return findIfBlock(elseIndex).endIndex;
      return findControlledStatementEnd(elseIndex + 1);
    }

    return statementIndex;
  }

  // else if の行をif文の開始行として扱い、後続のelseも含めて探します。
  function findControlledIfEnd(ifIndex){
    const ifCode = codeOutsideStringAndLineComment(lines[ifIndex]).trim().replace(/^else\s+/, '');
    const inlineBody = inlineIfBodyCode(ifCode);
    if(inlineBody === '{') return findIfBlock(ifIndex).endIndex;

    let trueEndIndex = ifIndex;
    if(inlineBody === ''){
      let controlledIndex = ifIndex + 1;
      while(controlledIndex < lines.length &&
            (lines[controlledIndex].trim() === '' || isCommentLine(lines[controlledIndex].trim()))){
        controlledIndex++;
      }
      if(controlledIndex < lines.length &&
         codeOutsideStringAndLineComment(lines[controlledIndex]).trim() === '{'){
        return findIfBlock(controlledIndex).endIndex;
      }
      trueEndIndex = findControlledStatementEnd(ifIndex + 1);
    }
    let elseIndex = trueEndIndex + 1;
    while(elseIndex < lines.length &&
          (lines[elseIndex].trim() === '' || isCommentLine(lines[elseIndex].trim()))){
      elseIndex++;
    }
    if(elseIndex >= lines.length) return trueEndIndex;

    const elseCode = codeOutsideStringAndLineComment(lines[elseIndex]).trim();
    if(!/^else\b/.test(elseCode)) return trueEndIndex;
    if(/^else\s+if\s*\(/.test(elseCode)) return findControlledIfEnd(elseIndex);
    if(/^else\s*\{/.test(elseCode)) return findIfBlock(elseIndex).endIndex;
    return findControlledStatementEnd(elseIndex + 1);
  }

  for(let index = 0; index < lines.length; index++){
    const trimmed = lines[index].trim();
    if(!/^if\s*\(/.test(trimmed)){
      processSimpleLine(lines[index], index);
      continue;
    }

    const headerMatch = trimmed.match(/^if\s*\((.*)\)\s*\{$/);
    if(!headerMatch){
      let skippedIndex = index + 1;
      while(skippedIndex < lines.length && (lines[skippedIndex].trim() === '' || isCommentLine(lines[skippedIndex].trim()))){
        skippedIndex++;
      }
      const nextStructuralCode = skippedIndex < lines.length
        ? codeOutsideStringAndLineComment(lines[skippedIndex]).trim()
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

    const block = findIfBlock(index);
    if(block.hasElse){
      warnUnsupportedIf(index, block.endIndex, 'else付きif文は未対応', 'else付きif文は現在未対応です。if側とelse側の処理は実行しません。');
      index = block.endIndex;
      continue;
    }
    if(block.nested || block.unsupportedBlock){
      warnUnsupportedIf(index, block.endIndex, '入れ子のブロックは未対応', 'if文のネストや、if文内の別のブロックは現在未対応です。外側のif文も実行しません。');
      index = block.endIndex;
      continue;
    }
    if(!block.closed){
      warnUnsupportedIf(index, block.endIndex, '閉じ波かっこを確認', 'if文の終わりを示す、単独行の } が見つかりません。中の処理は実行しません。');
      index = block.endIndex;
      continue;
    }

    const lineNo = index + 1;
    const condition = headerMatch[1].trim();
    const result = evaluateExpression(condition, variables);
    if(!result.ok){
      addAnalysis(analysis, lineNo, `if文の条件 <code>${escapeHtml(condition)}</code> を評価できませんでした。波かっこの中の処理は実行しません。`);
      addHint(hints, lineNo, 'if文の条件を評価できません', escapeHtml(result.error));
      warningLines.add(lineNo);
      addStep(lineNo, 'if文の条件を評価できなかったため、中の処理は実行しません。');
      markSkippedIfBody(index + 1, block.endIndex, true);
    }else{
      const conditionMet = result.value !== 0;
      const conditionExplanation = result.comparison
        ? describeComparison(result)
        : `${escapeHtml(result.readable)} を計算した結果は ${result.value} です。C言語では0以外を条件成立、0を条件不成立として扱います。`;
      addAnalysis(analysis, lineNo, `${conditionExplanation}${conditionMet ? '波かっこの中の処理を実行します。' : '波かっこの中の処理は実行しません。'}`);
      addStep(lineNo, `${escapeHtml(condition)}を判定しました。<br>${conditionMet ? '条件が成立したため、if文の中へ進みます。' : '条件が成立しなかったため、if文の中は実行しません。'}`);
      if(conditionMet){
        for(let bodyIndex = index + 1; bodyIndex < block.endIndex; bodyIndex++){
          processSimpleLine(lines[bodyIndex], bodyIndex, true);
        }
      }else{
        markSkippedIfBody(index + 1, block.endIndex, false);
      }
    }
    addAnalysis(analysis, block.endIndex + 1, 'if文の処理範囲の終わりです。');
    index = block.endIndex;
  }

  if(!hasMain){
    addHint(hints, null, 'main関数が見当たりません', '学習用の基本的なCプログラムでは、<code>int main(void)</code> などの開始地点を書くことが多いです。');
  }

  if(!hasReturn){
    addHint(hints, null, 'return 0; が見当たりません', '学習用の基本形として、最後に <code>return 0;</code> を書く形も確認しておきましょう。');
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

visualizeCode();
