# TypeScript Template

A modern TypeScript project template with comprehensive tooling setup including Jest testing, ESLint, Prettier, lint-staged, and Husky. Uses pnpm for fast, efficient package management.

## Features

- ⚡ **Latest TypeScript** (v5.3.3) with strict configuration
- 🧪 **Jest Testing** with ts-jest and coverage reporting
- 🔍 **ESLint** with basic JavaScript linting (TypeScript support can be added later)
- 💅 **Prettier** for consistent code formatting
- 🚀 **lint-staged** for pre-commit code quality checks
- 🐕 **Husky** for Git hooks
- 📦 **Modern Node.js** setup with ES2022 features
- ⚡ **pnpm** for fast, efficient package management

## Quick Start

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Set up Git hooks:**

   ```bash
   pnpm run prepare
   ```

3. **Build the project:**

   ```bash
   pnpm run build
   ```

4. **Run tests:**
   ```bash
   pnpm test
   ```

## Available Scripts

| Script                   | Description                       |
| ------------------------ | --------------------------------- |
| `pnpm run build`         | Compile TypeScript to JavaScript  |
| `pnpm run dev`           | Watch mode for development        |
| `pnpm test`              | Run Jest tests                    |
| `pnpm run test:watch`    | Run tests in watch mode           |
| `pnpm run test:coverage` | Run tests with coverage report    |
| `pnpm run lint`          | Run ESLint                        |
| `pnpm run lint:fix`      | Run ESLint with auto-fix          |
| `pnpm run format`        | Format code with Prettier         |
| `pnpm run format:check`  | Check code formatting             |
| `pnpm run pre-push`      | Run tests (used by pre-push hook) |

## Project Structure

```
typescript-template/
├── src/                    # Source code
│   └── index.ts           # Main entry point
├── __tests__/             # Test files
│   ├── setup.ts           # Jest setup
│   └── index.test.ts      # Sample tests
├── dist/                  # Compiled output (generated)
├── .husky/                # Git hooks
│   ├── pre-commit         # Pre-commit hook
│   └── pre-push           # Pre-push hook
├── .eslintrc.js           # ESLint configuration
├── .prettierrc            # Prettier configuration
├── .prettierignore        # Prettier ignore rules
├── jest.config.js         # Jest configuration
├── tsconfig.json          # TypeScript configuration
├── package.json           # Dependencies and scripts
├── pnpm-workspace.yaml    # pnpm workspace configuration
└── .npmrc                 # pnpm configuration
```

## Configuration

### TypeScript

- Target: ES2022
- Module: CommonJS
- Strict mode enabled
- Source maps and declaration files generated
- Path mapping: `@/*` → `src/*`

### ESLint

- TypeScript-aware linting
- Jest plugin for test files
- Prettier integration
- Modern JavaScript/TypeScript rules

### Prettier

- Single quotes
- 2-space indentation
- 80 character line width
- Trailing commas in ES5 mode

### Jest

- TypeScript support with ts-jest
- Coverage reporting
- Test files in `__tests__/` directory
- Setup file for global configuration

## Git Hooks

The project uses Husky for Git hooks:

### Pre-commit Hook

Runs lint-staged before each commit, which:

- Runs ESLint with auto-fix on TypeScript files
- Formats code with Prettier
- Ensures code quality before commits

### Pre-push Hook

Runs tests before pushing to the repository, which:

- Executes all Jest tests
- Prevents broken code from being pushed
- Ensures code reliability

## Development Workflow

1. **Write code** in the `src/` directory
2. **Write tests** in the `__tests__/` directory
3. **Run tests** with `pnpm test`
4. **Check code quality** with `pnpm run lint`
5. **Format code** with `pnpm run format`
6. **Commit changes** - pre-commit hooks will automatically run quality checks
7. **Push changes** - pre-push hooks will automatically run tests

## Adding New Dependencies

- **Runtime dependencies:** `pnpm add <package>`
- **Development dependencies:** `pnpm add -D <package>`

## TypeScript Path Mapping

Use the `@/` alias to import from the src directory:

```typescript
import { someFunction } from '@/utils/helpers';
```

## Testing

Tests are written using Jest and should be placed in the `__tests__/` directory. The setup file (`__tests__/setup.ts`) runs before each test file.

Example test:

```typescript
import { greet } from '@/index';

describe('greet', () => {
  it('should return a greeting', () => {
    expect(greet('World')).toBe('Hello, World!');
  });
});
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Commit your changes (hooks will run automatically)
7. Push to your branch
8. Create a pull request

## License

ISC
