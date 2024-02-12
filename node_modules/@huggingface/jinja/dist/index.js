// src/lexer.ts
var TOKEN_TYPES = Object.freeze({
  Text: "Text",
  // The text between Jinja statements or expressions
  NumericLiteral: "NumericLiteral",
  // e.g., 123
  BooleanLiteral: "BooleanLiteral",
  // true or false
  StringLiteral: "StringLiteral",
  // 'string'
  Identifier: "Identifier",
  // Variables, functions, etc.
  Equals: "Equals",
  // =
  OpenParen: "OpenParen",
  // (
  CloseParen: "CloseParen",
  // )
  OpenStatement: "OpenStatement",
  // {%
  CloseStatement: "CloseStatement",
  // %}
  OpenExpression: "OpenExpression",
  // {{
  CloseExpression: "CloseExpression",
  // }}
  OpenSquareBracket: "OpenSquareBracket",
  // [
  CloseSquareBracket: "CloseSquareBracket",
  // ]
  Comma: "Comma",
  // ,
  Dot: "Dot",
  // .
  Colon: "Colon",
  // :
  Pipe: "Pipe",
  // |
  CallOperator: "CallOperator",
  // ()
  AdditiveBinaryOperator: "AdditiveBinaryOperator",
  // + -
  MultiplicativeBinaryOperator: "MultiplicativeBinaryOperator",
  // * / %
  ComparisonBinaryOperator: "ComparisonBinaryOperator",
  // < > <= >= == !=
  UnaryOperator: "UnaryOperator",
  // ! - +
  // Keywords
  Set: "Set",
  If: "If",
  For: "For",
  In: "In",
  NotIn: "NotIn",
  Else: "Else",
  EndIf: "EndIf",
  ElseIf: "ElseIf",
  EndFor: "EndFor",
  And: "And",
  Or: "Or",
  Not: "UnaryOperator"
});
var KEYWORDS = Object.freeze({
  set: TOKEN_TYPES.Set,
  for: TOKEN_TYPES.For,
  in: TOKEN_TYPES.In,
  if: TOKEN_TYPES.If,
  else: TOKEN_TYPES.Else,
  endif: TOKEN_TYPES.EndIf,
  elif: TOKEN_TYPES.ElseIf,
  endfor: TOKEN_TYPES.EndFor,
  and: TOKEN_TYPES.And,
  or: TOKEN_TYPES.Or,
  not: TOKEN_TYPES.Not,
  "not in": TOKEN_TYPES.NotIn,
  // Literals
  true: TOKEN_TYPES.BooleanLiteral,
  false: TOKEN_TYPES.BooleanLiteral
});
var Token = class {
  /**
   * Constructs a new Token.
   * @param {string} value The raw value as seen inside the source code.
   * @param {TokenType} type The type of token.
   */
  constructor(value, type) {
    this.value = value;
    this.type = type;
  }
};
function isWord(char) {
  return /\w/.test(char);
}
function isInteger(char) {
  return /[0-9]/.test(char);
}
var ORDERED_MAPPING_TABLE = [
  // Control sequences
  ["{%", TOKEN_TYPES.OpenStatement],
  ["%}", TOKEN_TYPES.CloseStatement],
  ["{{", TOKEN_TYPES.OpenExpression],
  ["}}", TOKEN_TYPES.CloseExpression],
  // Single character tokens
  ["(", TOKEN_TYPES.OpenParen],
  [")", TOKEN_TYPES.CloseParen],
  ["[", TOKEN_TYPES.OpenSquareBracket],
  ["]", TOKEN_TYPES.CloseSquareBracket],
  [",", TOKEN_TYPES.Comma],
  [".", TOKEN_TYPES.Dot],
  [":", TOKEN_TYPES.Colon],
  ["|", TOKEN_TYPES.Pipe],
  // Comparison operators
  ["<=", TOKEN_TYPES.ComparisonBinaryOperator],
  [">=", TOKEN_TYPES.ComparisonBinaryOperator],
  ["==", TOKEN_TYPES.ComparisonBinaryOperator],
  ["!=", TOKEN_TYPES.ComparisonBinaryOperator],
  ["<", TOKEN_TYPES.ComparisonBinaryOperator],
  [">", TOKEN_TYPES.ComparisonBinaryOperator],
  // Arithmetic operators
  ["+", TOKEN_TYPES.AdditiveBinaryOperator],
  ["-", TOKEN_TYPES.AdditiveBinaryOperator],
  ["*", TOKEN_TYPES.MultiplicativeBinaryOperator],
  ["/", TOKEN_TYPES.MultiplicativeBinaryOperator],
  ["%", TOKEN_TYPES.MultiplicativeBinaryOperator],
  // Assignment operator
  ["=", TOKEN_TYPES.Equals]
];
var ESCAPE_CHARACTERS = /* @__PURE__ */ new Map([
  ["n", "\n"],
  // New line
  ["t", "	"],
  // Horizontal tab
  ["r", "\r"],
  // Carriage return
  ["b", "\b"],
  // Backspace
  ["f", "\f"],
  // Form feed
  ["v", "\v"],
  // Vertical tab
  ["'", "'"],
  // Single quote
  ['"', '"'],
  // Double quote
  ["\\", "\\"]
  // Backslash
]);
function tokenize(source) {
  const tokens = [];
  const src = source;
  let cursorPosition = 0;
  const consumeWhile = (predicate) => {
    let str = "";
    while (predicate(src[cursorPosition])) {
      if (src[cursorPosition] === "\\") {
        ++cursorPosition;
        if (cursorPosition >= src.length)
          throw new SyntaxError("Unexpected end of input");
        const escaped = src[cursorPosition++];
        const unescaped = ESCAPE_CHARACTERS.get(escaped);
        if (unescaped === void 0) {
          throw new SyntaxError(`Unexpected escaped character: ${escaped}`);
        }
        str += unescaped;
        continue;
      }
      str += src[cursorPosition++];
      if (cursorPosition >= src.length)
        throw new SyntaxError("Unexpected end of input");
    }
    return str;
  };
  main:
    while (cursorPosition < src.length) {
      const lastTokenType = tokens.at(-1)?.type;
      if (lastTokenType === void 0 || lastTokenType === TOKEN_TYPES.CloseStatement || lastTokenType === TOKEN_TYPES.CloseExpression) {
        let text = "";
        while (cursorPosition < src.length && // Keep going until we hit the next Jinja statement or expression
        !(src[cursorPosition] === "{" && (src[cursorPosition + 1] === "%" || src[cursorPosition + 1] === "{"))) {
          text += src[cursorPosition++];
        }
        if (text.length > 0) {
          tokens.push(new Token(text, TOKEN_TYPES.Text));
          continue;
        }
      }
      consumeWhile((char2) => /\s/.test(char2));
      const char = src[cursorPosition];
      if (char === "-" || char === "+") {
        const lastTokenType2 = tokens.at(-1)?.type;
        if (lastTokenType2 === TOKEN_TYPES.Text || lastTokenType2 === void 0) {
          throw new SyntaxError(`Unexpected character: ${char}`);
        }
        switch (lastTokenType2) {
          case TOKEN_TYPES.Identifier:
          case TOKEN_TYPES.NumericLiteral:
          case TOKEN_TYPES.BooleanLiteral:
          case TOKEN_TYPES.StringLiteral:
          case TOKEN_TYPES.CloseParen:
          case TOKEN_TYPES.CloseSquareBracket:
            break;
          default: {
            ++cursorPosition;
            const num = consumeWhile(isInteger);
            tokens.push(
              new Token(`${char}${num}`, num.length > 0 ? TOKEN_TYPES.NumericLiteral : TOKEN_TYPES.UnaryOperator)
            );
            continue;
          }
        }
      }
      for (const [char2, token] of ORDERED_MAPPING_TABLE) {
        const slice2 = src.slice(cursorPosition, cursorPosition + char2.length);
        if (slice2 === char2) {
          tokens.push(new Token(char2, token));
          cursorPosition += char2.length;
          continue main;
        }
      }
      if (char === "'") {
        ++cursorPosition;
        const str = consumeWhile((char2) => char2 !== "'");
        tokens.push(new Token(str, TOKEN_TYPES.StringLiteral));
        ++cursorPosition;
        continue;
      }
      if (isInteger(char)) {
        const num = consumeWhile(isInteger);
        tokens.push(new Token(num, TOKEN_TYPES.NumericLiteral));
        continue;
      }
      if (isWord(char)) {
        const word = consumeWhile(isWord);
        const type = Object.hasOwn(KEYWORDS, word) ? KEYWORDS[word] : TOKEN_TYPES.Identifier;
        if (type === TOKEN_TYPES.In && tokens.at(-1)?.type === TOKEN_TYPES.Not) {
          tokens.pop();
          tokens.push(new Token("not in", TOKEN_TYPES.NotIn));
        } else {
          tokens.push(new Token(word, type));
        }
        continue;
      }
      throw new SyntaxError(`Unexpected character: ${char}`);
    }
  return tokens;
}

// src/ast.ts
var Statement = class {
  type = "Statement";
};
var Program = class extends Statement {
  constructor(body) {
    super();
    this.body = body;
  }
  type = "Program";
};
var If = class extends Statement {
  constructor(test, body, alternate) {
    super();
    this.test = test;
    this.body = body;
    this.alternate = alternate;
  }
  type = "If";
};
var For = class extends Statement {
  constructor(loopvar, iterable, body) {
    super();
    this.loopvar = loopvar;
    this.iterable = iterable;
    this.body = body;
  }
  type = "For";
};
var SetStatement = class extends Statement {
  constructor(assignee, value) {
    super();
    this.assignee = assignee;
    this.value = value;
  }
  type = "Set";
};
var Expression = class extends Statement {
  type = "Expression";
};
var MemberExpression = class extends Expression {
  constructor(object, property, computed) {
    super();
    this.object = object;
    this.property = property;
    this.computed = computed;
  }
  type = "MemberExpression";
};
var CallExpression = class extends Expression {
  constructor(callee, args) {
    super();
    this.callee = callee;
    this.args = args;
  }
  type = "CallExpression";
};
var Identifier = class extends Expression {
  /**
   * @param {string} value The name of the identifier
   */
  constructor(value) {
    super();
    this.value = value;
  }
  type = "Identifier";
};
var Literal = class extends Expression {
  constructor(value) {
    super();
    this.value = value;
  }
  type = "Literal";
};
var NumericLiteral = class extends Literal {
  type = "NumericLiteral";
};
var StringLiteral = class extends Literal {
  type = "StringLiteral";
  constructor(value) {
    super(value);
  }
};
var BooleanLiteral = class extends Literal {
  type = "BooleanLiteral";
};
var BinaryExpression = class extends Expression {
  constructor(operator, left, right) {
    super();
    this.operator = operator;
    this.left = left;
    this.right = right;
  }
  type = "BinaryExpression";
};
var FilterExpression = class extends Expression {
  constructor(operand, filter) {
    super();
    this.operand = operand;
    this.filter = filter;
  }
  type = "FilterExpression";
};
var UnaryExpression = class extends Expression {
  constructor(operator, argument) {
    super();
    this.operator = operator;
    this.argument = argument;
  }
  type = "UnaryExpression";
};
var SliceExpression = class extends Expression {
  constructor(start = void 0, stop = void 0, step = void 0) {
    super();
    this.start = start;
    this.stop = stop;
    this.step = step;
  }
  type = "SliceExpression";
};

// src/parser.ts
function parse(tokens) {
  const program = new Program([]);
  let current = 0;
  function expect(type, error) {
    const prev = tokens[current++];
    if (!prev || prev.type !== type) {
      throw new Error(`Parser Error: ${error}. ${prev.type} !== ${type}.`);
    }
    return prev;
  }
  function parseAny() {
    switch (tokens[current].type) {
      case TOKEN_TYPES.Text:
        return parseText();
      case TOKEN_TYPES.OpenStatement:
        return parseJinjaStatement();
      case TOKEN_TYPES.OpenExpression:
        return parseJinjaExpression();
      default:
        throw new SyntaxError(`Unexpected token type: ${tokens[current].type}`);
    }
  }
  function not(...types) {
    return current + types.length <= tokens.length && types.some((type, i) => type !== tokens[current + i].type);
  }
  function is(...types) {
    return current + types.length <= tokens.length && types.every((type, i) => type === tokens[current + i].type);
  }
  function parseText() {
    return new StringLiteral(expect(TOKEN_TYPES.Text, "Expected text token").value);
  }
  function parseJinjaStatement() {
    expect(TOKEN_TYPES.OpenStatement, "Expected opening statement token");
    let result;
    switch (tokens[current].type) {
      case TOKEN_TYPES.Set:
        ++current;
        result = parseSetStatement();
        expect(TOKEN_TYPES.CloseStatement, "Expected closing statement token");
        break;
      case TOKEN_TYPES.If:
        ++current;
        result = parseIfStatement();
        expect(TOKEN_TYPES.OpenStatement, "Expected {% token");
        expect(TOKEN_TYPES.EndIf, "Expected endif token");
        expect(TOKEN_TYPES.CloseStatement, "Expected %} token");
        break;
      case TOKEN_TYPES.For:
        ++current;
        result = parseForStatement();
        expect(TOKEN_TYPES.OpenStatement, "Expected {% token");
        expect(TOKEN_TYPES.EndFor, "Expected endfor token");
        expect(TOKEN_TYPES.CloseStatement, "Expected %} token");
        break;
      default:
        throw new SyntaxError(`Unknown statement type: ${tokens[current].type}`);
    }
    return result;
  }
  function parseJinjaExpression() {
    expect(TOKEN_TYPES.OpenExpression, "Expected opening expression token");
    const result = parseExpression();
    expect(TOKEN_TYPES.CloseExpression, "Expected closing expression token");
    return result;
  }
  function parseSetStatement() {
    const left = parseExpression();
    if (is(TOKEN_TYPES.Equals)) {
      ++current;
      const value = parseSetStatement();
      return new SetStatement(left, value);
    }
    return left;
  }
  function parseIfStatement() {
    const test = parseExpression();
    expect(TOKEN_TYPES.CloseStatement, "Expected closing statement token");
    const body = [];
    const alternate = [];
    while (!(tokens[current]?.type === TOKEN_TYPES.OpenStatement && (tokens[current + 1]?.type === TOKEN_TYPES.ElseIf || tokens[current + 1]?.type === TOKEN_TYPES.Else || tokens[current + 1]?.type === TOKEN_TYPES.EndIf))) {
      body.push(parseAny());
    }
    if (tokens[current]?.type === TOKEN_TYPES.OpenStatement && tokens[current + 1]?.type !== TOKEN_TYPES.EndIf) {
      ++current;
      if (is(TOKEN_TYPES.ElseIf)) {
        expect(TOKEN_TYPES.ElseIf, "Expected elseif token");
        alternate.push(parseIfStatement());
      } else {
        expect(TOKEN_TYPES.Else, "Expected else token");
        expect(TOKEN_TYPES.CloseStatement, "Expected closing statement token");
        while (!(tokens[current]?.type === TOKEN_TYPES.OpenStatement && tokens[current + 1]?.type === TOKEN_TYPES.EndIf)) {
          alternate.push(parseAny());
        }
      }
    }
    return new If(test, body, alternate);
  }
  function parseForStatement() {
    const loopVariable = parsePrimaryExpression();
    if (!(loopVariable instanceof Identifier)) {
      throw new SyntaxError(`Expected identifier for the loop variable`);
    }
    expect(TOKEN_TYPES.In, "Expected `in` keyword following loop variable");
    const iterable = parseExpression();
    expect(TOKEN_TYPES.CloseStatement, "Expected closing statement token");
    const body = [];
    while (not(TOKEN_TYPES.OpenStatement, TOKEN_TYPES.EndFor)) {
      body.push(parseAny());
    }
    return new For(loopVariable, iterable, body);
  }
  function parseExpression() {
    return parseLogicalOrExpression();
  }
  function parseLogicalOrExpression() {
    let left = parseLogicalAndExpression();
    while (is(TOKEN_TYPES.Or)) {
      const operator = tokens[current];
      ++current;
      const right = parseLogicalAndExpression();
      left = new BinaryExpression(operator, left, right);
    }
    return left;
  }
  function parseLogicalAndExpression() {
    let left = parseLogicalNegationExpression();
    while (is(TOKEN_TYPES.And)) {
      const operator = tokens[current];
      ++current;
      const right = parseLogicalNegationExpression();
      left = new BinaryExpression(operator, left, right);
    }
    return left;
  }
  function parseLogicalNegationExpression() {
    let right;
    while (is(TOKEN_TYPES.Not)) {
      const operator = tokens[current];
      ++current;
      const arg = parseLogicalNegationExpression();
      right = new UnaryExpression(operator, arg);
    }
    return right ?? parseComparisonExpression();
  }
  function parseComparisonExpression() {
    let left = parseAdditiveExpression();
    while (is(TOKEN_TYPES.ComparisonBinaryOperator) || is(TOKEN_TYPES.In) || is(TOKEN_TYPES.NotIn)) {
      const operator = tokens[current];
      ++current;
      const right = parseAdditiveExpression();
      left = new BinaryExpression(operator, left, right);
    }
    return left;
  }
  function parseAdditiveExpression() {
    let left = parseMultiplicativeExpression();
    while (is(TOKEN_TYPES.AdditiveBinaryOperator)) {
      const operator = tokens[current];
      ++current;
      const right = parseMultiplicativeExpression();
      left = new BinaryExpression(operator, left, right);
    }
    return left;
  }
  function parseCallMemberExpression() {
    const member = parseMemberExpression();
    if (is(TOKEN_TYPES.OpenParen)) {
      return parseCallExpression(member);
    }
    return member;
  }
  function parseCallExpression(callee) {
    let callExpression = new CallExpression(callee, parseArgs());
    if (is(TOKEN_TYPES.OpenParen)) {
      callExpression = parseCallExpression(callExpression);
    }
    return callExpression;
  }
  function parseArgs() {
    expect(TOKEN_TYPES.OpenParen, "Expected opening parenthesis for arguments list");
    const args = is(TOKEN_TYPES.CloseParen) ? [] : parseArgumentsList();
    expect(TOKEN_TYPES.CloseParen, "Expected closing parenthesis for arguments list");
    return args;
  }
  function parseArgumentsList() {
    const args = [parseExpression()];
    while (is(TOKEN_TYPES.Comma)) {
      ++current;
      args.push(parseExpression());
    }
    return args;
  }
  function parseMemberExpressionArgumentsList() {
    const slices = [];
    let isSlice = false;
    while (!is(TOKEN_TYPES.CloseSquareBracket)) {
      if (is(TOKEN_TYPES.Colon)) {
        slices.push(void 0);
        ++current;
        isSlice = true;
      } else {
        slices.push(parseExpression());
        if (is(TOKEN_TYPES.Colon)) {
          ++current;
          isSlice = true;
        }
      }
    }
    if (slices.length === 0) {
      throw new SyntaxError(`Expected at least one argument for member/slice expression`);
    }
    if (isSlice) {
      if (slices.length > 3) {
        throw new SyntaxError(`Expected 0-3 arguments for slice expression`);
      }
      return new SliceExpression(...slices);
    }
    return slices[0];
  }
  function parseMemberExpression() {
    let object = parsePrimaryExpression();
    while (is(TOKEN_TYPES.Dot) || is(TOKEN_TYPES.OpenSquareBracket)) {
      const operator = tokens[current];
      ++current;
      let property;
      const computed = operator.type !== TOKEN_TYPES.Dot;
      if (computed) {
        property = parseMemberExpressionArgumentsList();
        expect(TOKEN_TYPES.CloseSquareBracket, "Expected closing square bracket");
      } else {
        property = parsePrimaryExpression();
        if (property.type !== "Identifier") {
          throw new SyntaxError(`Expected identifier following dot operator`);
        }
      }
      object = new MemberExpression(object, property, computed);
    }
    return object;
  }
  function parseMultiplicativeExpression() {
    let left = parseFilterExpression();
    while (is(TOKEN_TYPES.MultiplicativeBinaryOperator)) {
      const operator = tokens[current];
      ++current;
      const right = parseFilterExpression();
      left = new BinaryExpression(operator, left, right);
    }
    return left;
  }
  function parseFilterExpression() {
    let operand = parseCallMemberExpression();
    while (is(TOKEN_TYPES.Pipe)) {
      ++current;
      const filter = parsePrimaryExpression();
      if (!(filter instanceof Identifier)) {
        throw new SyntaxError(`Expected identifier for the filter`);
      }
      operand = new FilterExpression(operand, filter);
    }
    return operand;
  }
  function parsePrimaryExpression() {
    const token = tokens[current];
    switch (token.type) {
      case TOKEN_TYPES.NumericLiteral:
        ++current;
        return new NumericLiteral(Number(token.value));
      case TOKEN_TYPES.StringLiteral:
        ++current;
        return new StringLiteral(token.value);
      case TOKEN_TYPES.BooleanLiteral:
        ++current;
        return new BooleanLiteral(token.value === "true");
      case TOKEN_TYPES.Identifier:
        ++current;
        return new Identifier(token.value);
      case TOKEN_TYPES.OpenParen: {
        ++current;
        const expression = parseExpression();
        if (tokens[current].type !== TOKEN_TYPES.CloseParen) {
          throw new SyntaxError("Expected closing parenthesis");
        }
        ++current;
        return expression;
      }
      default:
        throw new SyntaxError(`Unexpected token: ${token.type}`);
    }
  }
  while (current < tokens.length) {
    program.body.push(parseAny());
  }
  return program;
}

// src/utils.ts
function slice(array, start, stop, step = 1) {
  const direction = Math.sign(step);
  if (direction >= 0) {
    start = (start ??= 0) < 0 ? Math.max(array.length + start, 0) : Math.min(start, array.length);
    stop = (stop ??= array.length) < 0 ? Math.max(array.length + stop, 0) : Math.min(stop, array.length);
  } else {
    start = (start ??= array.length - 1) < 0 ? Math.max(array.length + start, -1) : Math.min(start, array.length - 1);
    stop = (stop ??= -1) < -1 ? Math.max(array.length + stop, -1) : Math.min(stop, array.length - 1);
  }
  const result = [];
  for (let i = start; direction * i < direction * stop; i += step) {
    result.push(array[i]);
  }
  return result;
}

// src/runtime.ts
var RuntimeValue = class {
  type = "RuntimeValue";
  value;
  /**
   * A collection of built-in functions for this type.
   */
  builtins = /* @__PURE__ */ new Map();
  /**
   * Creates a new RuntimeValue.
   */
  constructor(value = void 0) {
    this.value = value;
  }
  /**
   * Determines truthiness or falsiness of the runtime value.
   * This function should be overridden by subclasses if it has custom truthiness criteria.
   * @returns {BooleanValue} BooleanValue(true) if the value is truthy, BooleanValue(false) otherwise.
   */
  __bool__() {
    return new BooleanValue(!!this.value);
  }
};
var NumericValue = class extends RuntimeValue {
  type = "NumericValue";
};
var StringValue = class extends RuntimeValue {
  type = "StringValue";
  builtins = /* @__PURE__ */ new Map([
    [
      "upper",
      new FunctionValue(() => {
        return new StringValue(this.value.toUpperCase());
      })
    ],
    [
      "lower",
      new FunctionValue(() => {
        return new StringValue(this.value.toLowerCase());
      })
    ],
    [
      "strip",
      new FunctionValue(() => {
        return new StringValue(this.value.trim());
      })
    ],
    ["length", new NumericValue(this.value.length)]
  ]);
};
var BooleanValue = class extends RuntimeValue {
  type = "BooleanValue";
};
var ObjectValue = class extends RuntimeValue {
  type = "ObjectValue";
  /**
   * NOTE: necessary to override since all JavaScript arrays are considered truthy,
   * while only non-empty Python arrays are consider truthy.
   *
   * e.g.,
   *  - JavaScript:  {} && 5 -> 5
   *  - Python:      {} and 5 -> {}
   */
  __bool__() {
    return new BooleanValue(this.value.size > 0);
  }
};
var ArrayValue = class extends RuntimeValue {
  type = "ArrayValue";
  builtins = /* @__PURE__ */ new Map([["length", new NumericValue(this.value.length)]]);
  /**
   * NOTE: necessary to override since all JavaScript arrays are considered truthy,
   * while only non-empty Python arrays are consider truthy.
   *
   * e.g.,
   *  - JavaScript:  [] && 5 -> 5
   *  - Python:      [] and 5 -> []
   */
  __bool__() {
    return new BooleanValue(this.value.length > 0);
  }
};
var FunctionValue = class extends RuntimeValue {
  type = "FunctionValue";
};
var NullValue = class extends RuntimeValue {
  type = "NullValue";
};
var UndefinedValue = class extends RuntimeValue {
  type = "UndefinedValue";
};
var Environment = class {
  constructor(parent) {
    this.parent = parent;
  }
  /**
   * The variables declared in this environment.
   */
  variables = /* @__PURE__ */ new Map();
  /**
   * Set the value of a variable in the current environment.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
  set(name, value) {
    return this.declareVariable(name, convertToRuntimeValues(value));
  }
  declareVariable(name, value) {
    if (this.variables.has(name)) {
      throw new SyntaxError(`Variable already declared: ${name}`);
    }
    this.variables.set(name, value);
    return value;
  }
  // private assignVariable(name: string, value: AnyRuntimeValue): AnyRuntimeValue {
  // 	const env = this.resolve(name);
  // 	env.variables.set(name, value);
  // 	return value;
  // }
  /**
   * Declare if doesn't exist, assign otherwise.
   */
  setVariable(name, value) {
    let env;
    try {
      env = this.resolve(name);
    } catch {
    }
    (env ?? this).variables.set(name, value);
    return value;
  }
  /**
   * Resolve the environment in which the variable is declared.
   * @param {string} name The name of the variable.
   * @returns {Environment} The environment in which the variable is declared.
   */
  resolve(name) {
    if (this.variables.has(name)) {
      return this;
    }
    if (this.parent) {
      return this.parent.resolve(name);
    }
    throw new Error(`Unknown variable: ${name}`);
  }
  lookupVariable(name) {
    return this.resolve(name).variables.get(name) ?? new NullValue();
  }
};
var Interpreter = class {
  global;
  constructor(env) {
    this.global = env ?? new Environment();
  }
  /**
   * Run the program.
   */
  run(program) {
    return this.evaluate(program, this.global);
  }
  /**
   * Evaulates expressions following the binary operation type.
   */
  evaluateBinaryExpression(node, environment) {
    const left = this.evaluate(node.left, environment);
    const right = this.evaluate(node.right, environment);
    switch (node.operator.value) {
      case "==":
        return new BooleanValue(left.value == right.value);
      case "!=":
        return new BooleanValue(left.value != right.value);
      case "and":
        return left.__bool__().value ? right : left;
      case "or":
        return left.__bool__().value ? left : right;
    }
    if (left instanceof UndefinedValue || right instanceof UndefinedValue) {
      throw new Error("Cannot perform operation on undefined values");
    } else if (left instanceof NullValue || right instanceof NullValue) {
      throw new Error("Cannot perform operation on null values");
    } else if (left instanceof NumericValue && right instanceof NumericValue) {
      switch (node.operator.value) {
        case "+":
          return new NumericValue(left.value + right.value);
        case "-":
          return new NumericValue(left.value - right.value);
        case "*":
          return new NumericValue(left.value * right.value);
        case "/":
          return new NumericValue(left.value / right.value);
        case "%":
          return new NumericValue(left.value % right.value);
        case "<":
          return new BooleanValue(left.value < right.value);
        case ">":
          return new BooleanValue(left.value > right.value);
        case ">=":
          return new BooleanValue(left.value >= right.value);
        case "<=":
          return new BooleanValue(left.value <= right.value);
      }
    } else if (right instanceof ArrayValue) {
      const member = right.value.find((x) => x.value === left.value) !== void 0;
      switch (node.operator.value) {
        case "in":
          return new BooleanValue(member);
        case "not in":
          return new BooleanValue(!member);
      }
    }
    if (left instanceof StringValue || right instanceof StringValue) {
      switch (node.operator.value) {
        case "+":
          return new StringValue(left.value.toString() + right.value.toString());
      }
    }
    if (left instanceof StringValue && right instanceof StringValue) {
      switch (node.operator.value) {
        case "in":
          return new BooleanValue(right.value.includes(left.value));
        case "not in":
          return new BooleanValue(!right.value.includes(left.value));
      }
    }
    throw new SyntaxError(`Unknown operator "${node.operator.value}" between ${left.type} and ${right.type}`);
  }
  /**
   * Evaulates expressions following the filter operation type.
   */
  evaluateFilterExpression(node, environment) {
    const operand = this.evaluate(node.operand, environment);
    if (operand instanceof ArrayValue) {
      switch (node.filter.value) {
        case "first":
          return operand.value[0];
        case "last":
          return operand.value[operand.value.length - 1];
        case "length":
          return new NumericValue(operand.value.length);
        case "reverse":
          return new ArrayValue(operand.value.reverse());
        case "sort":
          return new ArrayValue(
            operand.value.sort((a, b) => {
              if (a.type !== b.type) {
                throw new Error(`Cannot compare different types: ${a.type} and ${b.type}`);
              }
              switch (a.type) {
                case "NumericValue":
                  return a.value - b.value;
                case "StringValue":
                  return a.value.localeCompare(b.value);
                default:
                  throw new Error(`Cannot compare type: ${a.type}`);
              }
            })
          );
        default:
          throw new Error(`Unknown filter: ${node.filter.value}`);
      }
    }
    throw new Error(`Cannot apply filter to type: ${operand.type}`);
  }
  /**
   * Evaulates expressions following the unary operation type.
   */
  evaluateUnaryExpression(node, environment) {
    const argument = this.evaluate(node.argument, environment);
    switch (node.operator.value) {
      case "not":
        return new BooleanValue(!argument.value);
      default:
        throw new SyntaxError(`Unknown operator: ${node.operator.value}`);
    }
  }
  evalProgram(program, environment) {
    return this.evaluateBlock(program.body, environment);
  }
  evaluateBlock(statements, environment) {
    let result = "";
    for (const statement of statements) {
      const lastEvaluated = this.evaluate(statement, environment);
      if (lastEvaluated.type !== "NullValue") {
        result += lastEvaluated.value;
      }
    }
    result = result.replace(/^\n/, "");
    return new StringValue(result);
  }
  evaluateIdentifier(node, environment) {
    return environment.lookupVariable(node.value);
  }
  evaluateCallExpression(expr, environment) {
    const args = expr.args.map((arg) => this.evaluate(arg, environment));
    const fn = this.evaluate(expr.callee, environment);
    if (fn.type !== "FunctionValue") {
      throw new Error(`Cannot call something that is not a function: got ${fn.type}`);
    }
    return fn.value(args, environment);
  }
  evaluateSliceExpression(object, expr, environment) {
    if (!(object instanceof ArrayValue || object instanceof StringValue)) {
      throw new Error("Slice object must be an array or string");
    }
    const start = this.evaluate(expr.start, environment);
    const stop = this.evaluate(expr.stop, environment);
    const step = this.evaluate(expr.step, environment);
    if (!(start instanceof NumericValue || start instanceof UndefinedValue)) {
      throw new Error("Slice start must be numeric or undefined");
    }
    if (!(stop instanceof NumericValue || stop instanceof UndefinedValue)) {
      throw new Error("Slice stop must be numeric or undefined");
    }
    if (!(step instanceof NumericValue || step instanceof UndefinedValue)) {
      throw new Error("Slice step must be numeric or undefined");
    }
    if (object instanceof ArrayValue) {
      return new ArrayValue(slice(object.value, start.value, stop.value, step.value));
    } else {
      return new StringValue(slice(Array.from(object.value), start.value, stop.value, step.value).join(""));
    }
  }
  evaluateMemberExpression(expr, environment) {
    const object = this.evaluate(expr.object, environment);
    let property;
    if (expr.computed) {
      if (expr.property.type === "SliceExpression") {
        return this.evaluateSliceExpression(object, expr.property, environment);
      } else {
        property = this.evaluate(expr.property, environment);
      }
    } else {
      property = new StringValue(expr.property.value);
    }
    let value;
    if (object instanceof ObjectValue) {
      if (!(property instanceof StringValue)) {
        throw new Error(`Cannot access property with non-string: got ${property.type}`);
      }
      value = object.value.get(property.value) ?? object.builtins.get(property.value);
    } else if (object instanceof ArrayValue || object instanceof StringValue) {
      if (property instanceof NumericValue) {
        value = object.value.at(property.value);
        if (object instanceof StringValue) {
          value = new StringValue(object.value.at(property.value));
        }
      } else if (property instanceof StringValue) {
        value = object.builtins.get(property.value);
      } else {
        throw new Error(`Cannot access property with non-string/non-number: got ${property.type}`);
      }
    } else {
      if (!(property instanceof StringValue)) {
        throw new Error(`Cannot access property with non-string: got ${property.type}`);
      }
      value = object.builtins.get(property.value);
    }
    if (!(value instanceof RuntimeValue)) {
      throw new Error(`${object.type} has no property '${property.value}'`);
    }
    return value;
  }
  evaluateSet(node, environment) {
    if (node.assignee.type !== "Identifier") {
      throw new Error(`Invalid LHS inside assignment expression: ${JSON.stringify(node.assignee)}`);
    }
    const variableName = node.assignee.value;
    environment.setVariable(variableName, this.evaluate(node.value, environment));
    return new NullValue();
  }
  evaluateIf(node, environment) {
    const test = this.evaluate(node.test, environment);
    return this.evaluateBlock(test.__bool__().value ? node.body : node.alternate, environment);
  }
  evaluateFor(node, environment) {
    const scope = new Environment(environment);
    const iterable = this.evaluate(node.iterable, scope);
    if (!(iterable instanceof ArrayValue)) {
      throw new Error(`Expected iterable type in for loop: got ${iterable.type}`);
    }
    let result = "";
    for (let i = 0; i < iterable.value.length; ++i) {
      scope.setVariable(
        "loop",
        new ObjectValue(
          new Map(
            [
              ["index", new NumericValue(i + 1)],
              ["index0", new NumericValue(i)],
              ["first", new BooleanValue(i === 0)],
              ["last", new BooleanValue(i === iterable.value.length - 1)],
              ["length", new NumericValue(iterable.value.length)]
            ].map(([key, value]) => [key, value])
          )
        )
      );
      scope.setVariable(node.loopvar.value, iterable.value[i]);
      const evaluated = this.evaluateBlock(node.body, scope);
      result += evaluated.value;
    }
    return new StringValue(result);
  }
  evaluate(statement, environment) {
    if (statement === void 0)
      return new UndefinedValue();
    switch (statement.type) {
      case "Program":
        return this.evalProgram(statement, environment);
      case "Set":
        return this.evaluateSet(statement, environment);
      case "If":
        return this.evaluateIf(statement, environment);
      case "For":
        return this.evaluateFor(statement, environment);
      case "NumericLiteral":
        return new NumericValue(Number(statement.value));
      case "StringLiteral":
        return new StringValue(statement.value);
      case "BooleanLiteral":
        return new BooleanValue(statement.value);
      case "Identifier":
        return this.evaluateIdentifier(statement, environment);
      case "CallExpression":
        return this.evaluateCallExpression(statement, environment);
      case "MemberExpression":
        return this.evaluateMemberExpression(statement, environment);
      case "UnaryExpression":
        return this.evaluateUnaryExpression(statement, environment);
      case "BinaryExpression":
        return this.evaluateBinaryExpression(statement, environment);
      case "FilterExpression":
        return this.evaluateFilterExpression(statement, environment);
      default:
        throw new SyntaxError(`Unknown node type: ${statement.type}`);
    }
  }
};
function convertToRuntimeValues(input) {
  switch (typeof input) {
    case "number":
      return new NumericValue(input);
    case "string":
      return new StringValue(input);
    case "boolean":
      return new BooleanValue(input);
    case "object":
      if (input === null) {
        return new NullValue();
      } else if (Array.isArray(input)) {
        return new ArrayValue(input.map(convertToRuntimeValues));
      } else {
        return new ObjectValue(
          new Map(Object.entries(input).map(([key, value]) => [key, convertToRuntimeValues(value)]))
        );
      }
    case "function":
      return new FunctionValue((args, _scope) => {
        const result = input(...args.map((x) => x.value)) ?? null;
        return convertToRuntimeValues(result);
      });
    default:
      throw new Error(`Cannot convert to runtime value: ${input}`);
  }
}

// src/index.ts
var Template = class {
  parsed;
  /**
   * @param {string} template The template string
   */
  constructor(template) {
    template = template.replace(/%}\s+{%/g, "%}{%");
    const tokens = tokenize(template);
    this.parsed = parse(tokens);
  }
  render(items) {
    const env = new Environment();
    env.set("false", false);
    env.set("true", true);
    env.set("raise_exception", (args) => {
      throw new Error(args);
    });
    for (const [key, value] of Object.entries(items)) {
      env.set(key, value);
    }
    const interpreter = new Interpreter(env);
    const result = interpreter.run(this.parsed);
    return result.value;
  }
};
export {
  Environment,
  Interpreter,
  Template,
  parse,
  tokenize
};
