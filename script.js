const samples = {
  basic: `#include <stdio.h>\n\nint main(void){\n    int a = 3;\n    int b = 5;\n    int c = a + b;\n    printf("%d\\n", c);\n    return 0;\n}`,
  calc: `#include <stdio.h>\n\nint main(void){\n    int price = 120;\n    int count = 4;\n    int total = price * count;\n    int change = 1000 - total;\n    printf("合計:%d円\\n", total);\n    printf("おつり:%d円\\n", change);\n    return 0;\n}`,
  calcSimple: `#include <stdio.h>\n\nint main(void){\n    int price = 120;\n    int count = 3;\n    int total = price * count;\n    printf("%d円です\\n", total);\n    return 0;\n}`,
  assign: `#include <stdio.h>\n\nint main(void){\n    int score = 60;\n    score = score + 15;\n    printf("%d\\n", score);\n    return 0;\n}`,
  unsupported: `#include <stdio.h>\n\nint main(void){\n    int score = 78;\n    if(score >= 60){\n        printf("合格です\\n");\n    }\n    return 0;\n}`
};

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

function evaluateExpression(expr, variables){
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
        return { ok:false, error:`変数 ${token} はまだ値が入っていないか、宣言されていません。` };
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


function isSimpleIntegerLiteral(expr){
  return /^[-+]?\d+$/.test(String(expr).trim());
}

function makeInitialValueExplanation(name, expr, result){
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

  function rememberVariable(name, value){
    if(!(name in variables)) variableOrder.push(name);
    variables[name] = value;
  }

  function addStep(lineNo, text){
    steps.push({ step:stepNo++, lineNo, text });
    executedLines.add(lineNo);
  }

  lines.forEach((rawLine, index) => {
    const lineNo = index + 1;
    const trimmed = rawLine.trim();

    for(const ch of trimmed){
      if(ch === '{') braceBalance++;
      if(ch === '}') braceBalance--;
    }

    if(trimmed === ''){
      addAnalysis(analysis, lineNo, '空欄です。処理は行いません。');
      return;
    }

    if(isCommentLine(trimmed)){
      addAnalysis(analysis, lineNo, 'コメントです。プログラムの動作には直接関係しません。');
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
      addAnalysis(analysis, lineNo, 'Ver.0.1では未対応の構文です。今後の拡張対象として扱います。');
      addHint(hints, lineNo, 'Ver.0.1では未対応', '現在は int、代入、整数の四則演算、printf の処理過程可視化に絞っています。この行は正確には実行シミュレートしていません。');
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
      const name = declMatch[1];
      const expr = declMatch[2];
      if(expr === undefined){
        rememberVariable(name, 0);
        addAnalysis(analysis, lineNo, `整数型の変数 <code>${name}</code> を作りました。Ver.0.1では、未初期化の値は学習用に <code>0</code> として扱います。`);
        addStep(lineNo, `${name} という整数の箱を作り、学習用に 0 を代入しました。`);
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
        addAnalysis(analysis, lineNo, `変数 <code>${name}</code> に、<code>${escapeHtml(expr)}</code> の計算結果 <code>${result.value}</code> を代入しました。`);
        addStep(lineNo, `${name} の中身を ${before} から ${result.value} に変えました。計算：${escapeHtml(result.readable)} = ${result.value}`);
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
      const readableArgs = [];
      let ok = true;
      let error = '';

      for(const arg of args){
        const result = evaluateExpression(arg, variables);
        if(result.ok){
          values.push(result.value);
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
          if(args.length === 1){
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

    addAnalysis(analysis, lineNo, 'Ver.0.1では説明未対応のコードです。');
    if(trimmed !== ''){
      addHint(hints, lineNo, '未対応コード', 'この行は現在の可視化対象外です。まずは int、代入、四則演算、printf の範囲で試してみましょう。');
      warningLines.add(lineNo);
    }
  });

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
    ? variableOrder.map(name => `<div class="variable-chip">${escapeHtml(name)} = ${escapeHtml(String(variables[name]))}</div>`).join('')
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
