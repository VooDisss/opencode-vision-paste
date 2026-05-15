# Contributing

Thanks for your interest in contributing to opencode-vision-paste!

## How to contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Run syntax check (`npm test`)
5. Commit with a clear message
6. Push and open a Pull Request

## Development setup

```bash
git clone https://github.com/wsaaaqqq/opencode-vision-paste.git
cd opencode-vision-paste
npm test  # syntax check
```

The plugin is a single file (`vision-paste.mjs`) with zero dependencies. No build step required.

## Testing

To test your changes:

1. Add the local plugin to `.opencode/opencode.jsonc`:
   ```jsonc
   { "plugin": ["./path/to/vision-paste.mjs"] }
   ```
2. Restart OpenCode or use `/model` to reload
3. Paste an image in a chat session

## Code style

- Single ESM file, no external dependencies
- Keep it simple — no build step, no TypeScript, no tests framework
- Follow the existing code style (no semicolons, clean error handling)

## Pull Request guidelines

- Keep changes focused and minimal
- Update README translations if adding new features
- Update `CONFIGURATION.md` if changing configuration options
