# Coding Standards (Based on Readable Code)

Core principle: **Write code so that others can understand it in the shortest time possible.**
Prioritize understandability over brevity. When in doubt, ask yourself: "Would someone reading this code for the first time understand it?"

---

## 1. Naming

### Use clear and specific names
- Avoid overly generic names like `get`, `set`, `data`, `info`, `tmp`, `retval`
- The name should convey what it does: `fetchUserProfile()` > `getData()`
- Loop variables `i`, `j` are acceptable only in small scopes

### Choose names that cannot be misinterpreted
- Always check whether a name "could be interpreted differently"
- For ranges: `min` / `max` (inclusive bounds), `first` / `last` (inclusive range), `begin` / `end` (half-open interval)
- For booleans: use `is`, `has`, `can`, `should` as prefixes. Avoid negated forms (`isNotValid`)
- Be careful with ambiguous verbs like `filter`, `clip`, `remove` -- make it clear whether the operation selects or excludes

### Naming conventions
- Variables and functions: `camelCase`
- Classes, interfaces, and types: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- File names: `kebab-case.ts` (`PascalCase.ts` is also acceptable for class files)
- Private members: do not use a leading `_`. TypeScript's `private` keyword is sufficient
- Only use widely recognized abbreviations: `doc`, `str`, `config`, `max`, `min` -> OK. Team-specific abbreviations -> NG

---

## 2. Comments

### Comments you should write
- **Why it was done (WHY)**: Intent or context that cannot be inferred from the code
- **Rationale for constants**: Explain why a particular magic number was chosen
- **Gotchas**: Counter-intuitive behavior, known limitations
- **TODO / HACK / FIXME**: Clearly mark areas that need improvement

### Comments you should not write
- Comments that merely repeat what the code already says
- Comments that are unnecessary when function and variable names are descriptive enough
- Commented-out code (delete it and rely on version control)

### Keep comments concise
- Long comments go unread. Keep them to 1-2 lines
- Avoid vague language like "I think..." or "probably..."; state facts

---

## 3. Function Design

### Each function should do one thing only
- If you can describe a function as "does X and Y," consider splitting it
- Keep abstraction levels consistent. Do not mix high-level and low-level operations in the same function

### Use early returns to reduce nesting
```typescript
// Bad: deeply nested
function process(user: User) {
  if (user) {
    if (user.isActive) {
      if (user.hasPermission) {
        // actual logic
      }
    }
  }
}

// Good: guard clauses with early returns
function process(user: User) {
  if (!user) return;
  if (!user.isActive) return;
  if (!user.hasPermission) return;
  // actual logic
}
```

### Keep the number of arguments small
- Ideally 3 or fewer. If there are 4 or more, group them into an object
- Avoid boolean arguments (flag arguments). Splitting into separate functions is clearer

### Minimize side effects
- Do not introduce side effects that cannot be predicted from the function name
- Separate functions that mutate state from functions that return values (Command-Query Separation)

---

## 4. Control Flow

### Make conditionals readable
- Comparisons: place the changing value on the left, the stable value on the right: `age >= 18` > `18 <= age`
- Prefer positive conditions first: `if (isValid)` > `if (!isInvalid)`
- Use the ternary operator only for simple assignments. Never nest them

### Keep nesting shallow
- Maximum 2 levels. Resolve 3+ levels by extracting functions or using guard clauses
- If an `else` chain gets long, switch to early returns or a switch/map pattern

### Keep loops simple
- Do not do multiple things inside a loop
- Limit `continue` / `break` to one per loop. If you need more, reconsider the design

---

## 5. Variables

### Minimize scope
- Declare variables just before they are used
- Do not use global variables
- Prefer `const` over `let`. Always use `const` when reassignment is not needed

### Eliminate unnecessary variables
- If a variable is used only once and the expression itself is clear, there is no need to assign it to a variable
- However, actively use "explanatory variables" and "summary variables" to break down complex expressions

```typescript
// Explanatory variables to clarify intent
const isWeekday = day !== 'Saturday' && day !== 'Sunday';
const isBusinessHour = hour >= 9 && hour < 17;
if (isWeekday && isBusinessHour) { ... }
```

### Default to immutability
- Use spread operators and map/filter to create new values for objects and arrays whenever possible
- Limit the use of mutating methods (push, splice, etc.)

---

## 6. Code Organization

### One file, one responsibility
- Consider splitting when a file exceeds 300 lines
- Place related type definitions near where they are used. Only types shared across modules go in `shared/types.ts`

### Import order
1. Node.js built-ins / external libraries
2. Other directories within the project
3. Same directory
4. Type-only imports (`import type`)

Separate each group with a blank line.

### Export policy
- Use named exports by default
- Do not use default exports (they make names harder to track during refactoring)

---

## 7. Error Handling

### Fail early
- Detect invalid input at the beginning of a function and raise an error immediately
- Do not defer null checks

### Make error messages specific
- Include what happened, what was expected, and how to resolve it
- `"Error occurred"` -> NG. `"Failed to load config: file not found at ${path}"` -> OK

### Minimize the scope of try-catch
- Only include the error-prone operation inside the try block
- Do not silently swallow errors in catch. At minimum, log them

---

## 8. Testing

### Make tests readable too
- Test names should convey "what / under what conditions / what should happen"
- One assertion per test (not strictly enforced, but each test should verify a single behavior)
- Avoid over-abstracting test helper functions; the flow should be traceable within the test code

### Make failures easy to diagnose
- Use assertions with custom messages
- Choose minimal test data with clear intent
