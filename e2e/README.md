# MCP.Guard E2E Testing Framework

Comprehensive End-to-End testing framework for MCP.Guard using Playwright.

## 🎭 Features

- **Page Object Model**: Structured, maintainable test code
- **Cross-browser Testing**: Chrome, Firefox, Safari, Edge
- **Mobile/Responsive Testing**: Phone and tablet layouts
- **Docker Support**: Containerized testing environment
- **CI/CD Integration**: GitHub Actions workflows
- **Parallel Execution**: Fast test runs
- **Visual Testing**: Screenshots and videos on failure
- **API Testing**: REST API validation
- **Accessibility Testing**: Basic accessibility checks

## 📁 Structure

```
e2e/
├── package.json              # Test dependencies
├── playwright.config.ts      # Playwright configuration
├── global-setup.ts          # Global test setup
├── global-teardown.ts       # Global test teardown
├── docker-compose.yml       # Docker test environment
├── Dockerfile.playwright    # Playwright container
├── .env.example             # Environment variables template
├── scripts/
│   └── run-tests.sh         # Test runner script
├── pages/
│   ├── BasePage.ts          # Base page object
│   ├── DashboardPage.ts     # Dashboard page object
│   └── ProblemsPage.ts      # Problems page object
├── tests/
│   ├── 01-dashboard.spec.ts # Dashboard functionality tests
│   ├── 02-problems.spec.ts  # Problems page tests
│   ├── 03-navigation.spec.ts # Navigation and routing tests
│   ├── 04-api-integration.spec.ts # API integration tests
│   └── 05-end-to-end.spec.ts # Complete user workflows
└── test-results/           # Test outputs (auto-generated)
    ├── screenshots/
    ├── videos/
    └── reports/
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- MCP.Guard application running or Docker available
- Playwright browsers installed

### 1. Install Dependencies

```bash
cd e2e
npm install
npx playwright install
```

### 2. Set Up Environment

```bash
cp .env.example .env
# Edit .env with your settings
```

### 3. Run Tests

**Local Testing** (MCP.Guard app running on localhost:3000):
```bash
npm test
```

**Docker Testing** (Full containerized environment):
```bash
npm run test:docker
```

**Interactive Mode**:
```bash
npm run test:ui
```

**Debug Mode**:
```bash
npm run test:debug
```

## 🧪 Test Categories

### 1. Dashboard Tests (`01-dashboard.spec.ts`)
- ✅ Dashboard loading and rendering
- ✅ Status cards functionality
- ✅ Navigation between sections
- ✅ Real-time data updates
- ✅ Responsive layout testing
- ✅ Error handling

### 2. Problems Management (`02-problems.spec.ts`)
- ✅ Problems list display
- ✅ Filtering and searching
- ✅ Problem resolution workflow
- ✅ Details view
- ✅ Data export
- ✅ Empty state handling

### 3. Navigation & Routing (`03-navigation.spec.ts`)
- ✅ Sidebar navigation
- ✅ Direct URL access
- ✅ Browser back/forward
- ✅ 404 error handling
- ✅ Route persistence

### 4. API Integration (`04-api-integration.spec.ts`)
- ✅ Health check endpoints
- ✅ CRUD operations
- ✅ Error response handling
- ✅ Content type validation
- ✅ CORS configuration

### 5. End-to-End Workflows (`05-end-to-end.spec.ts`)
- ✅ Complete user journeys
- ✅ Cross-page data consistency
- ✅ Error recovery
- ✅ Performance validation
- ✅ Accessibility compliance
- ✅ System health checks

## 🐳 Docker Testing

The framework includes a complete Docker environment for isolated testing:

```bash
# Start full test environment
docker-compose up --build

# Run specific test suite
docker-compose run playwright npm test -- --grep "dashboard"

# Clean up
docker-compose down -v
```

### Docker Components:
- **MCP.Guard Application**: Full application stack
- **PostgreSQL**: Test database
- **Redis**: Caching layer
- **Playwright**: Test execution environment

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:3000` | Application URL |
| `CI` | `false` | CI environment flag |
| `HEADLESS` | `true` | Run browsers in headless mode |
| `WORKERS` | `4` | Parallel test workers |
| `RETRIES` | `2` | Test retry attempts |
| `TEST_TIMEOUT` | `30000` | Test timeout in ms |

### Browser Configuration

```typescript
// playwright.config.ts
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
]
```

## 📊 Reports and Results

### HTML Report
```bash
npm run test:report
```

### Screenshots and Videos
- Automatic capture on test failure
- Stored in `test-results/` directory
- Configurable retention policy

### CI Integration
- JUnit XML reports
- GitHub Actions artifacts
- Slack notifications (optional)

## 🎯 Writing Tests

### Page Object Example

```typescript
// pages/MyPage.ts
import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class MyPage extends BasePage {
  readonly myElement: Locator;

  constructor(page: Page) {
    super(page);
    this.myElement = page.locator('[data-testid="my-element"]');
  }

  async performAction() {
    await this.myElement.click();
    await this.waitForPageLoad();
  }
}
```

### Test Example

```typescript
// tests/my-feature.spec.ts
import { test, expect } from '@playwright/test';
import { MyPage } from '../pages/MyPage';

test.describe('My Feature', () => {
  test('should work correctly', async ({ page }) => {
    const myPage = new MyPage(page);
    await myPage.goto('/my-page');
    await myPage.performAction();
    
    await expect(myPage.myElement).toBeVisible();
  });
});
```

## 🚀 Advanced Features

### Visual Regression Testing
```bash
# Generate baseline screenshots
npx playwright test --update-snapshots

# Compare against baseline
npx playwright test
```

### Performance Testing
```typescript
test('should load quickly', async ({ page }) => {
  const startTime = Date.now();
  await page.goto('/');
  const loadTime = Date.now() - startTime;
  expect(loadTime).toBeLessThan(3000);
});
```

### Accessibility Testing
```typescript
test('should be accessible', async ({ page }) => {
  await page.goto('/');
  
  // Check for ARIA labels
  const buttons = await page.locator('button').count();
  const labeledButtons = await page.locator('button[aria-label], button[aria-labelledby]').count();
  
  expect(labeledButtons / buttons).toBeGreaterThan(0.8);
});
```

## 🔄 CI/CD Integration

### GitHub Actions

The framework includes three GitHub Actions workflows:

1. **Standard E2E Tests**: Runs on every PR/push
2. **Docker E2E Tests**: Full containerized testing
3. **Mobile E2E Tests**: Mobile-specific test suite

### Trigger Examples

```bash
# Run all tests
git commit -m "Add new feature"

# Run Docker tests
git commit -m "Update Docker config [docker-e2e]"

# Run mobile tests
git commit -m "Fix responsive layout [mobile-e2e]"
```

## 🛠️ Maintenance

### Update Browsers
```bash
npx playwright install
```

### Clear Test Cache
```bash
rm -rf test-results/
rm -rf playwright-report/
```

### Debug Failed Tests
```bash
npm run test:debug -- --grep "specific test"
```

## 📈 Best Practices

1. **Use data-testid attributes** for reliable element selection
2. **Wait for network idle** before assertions
3. **Handle loading states** appropriately
4. **Test error scenarios** alongside happy paths
5. **Keep tests independent** and idempotent
6. **Use Page Object Model** for maintainability
7. **Implement proper cleanup** after tests
8. **Mock external services** when appropriate

## 🤝 Contributing

1. Add new page objects to `pages/` directory
2. Create focused test files in `tests/` directory
3. Update documentation for new features
4. Run full test suite before submitting PR
5. Follow existing naming conventions

## 📞 Troubleshooting

### Common Issues

**Tests fail to start:**
- Check if MCP.Guard application is running
- Verify database connectivity
- Check port availability

**Browser installation issues:**
```bash
npx playwright install --force
sudo npx playwright install-deps
```

**Docker issues:**
```bash
docker-compose down -v
docker system prune -f
```

**Flaky tests:**
- Increase timeout values
- Add explicit waits
- Check for race conditions

### Debug Commands

```bash
# Verbose output
npm test -- --verbose

# Specific browser
npm test -- --project=chromium

# Headed mode with slow motion
npm test -- --headed --slowMo=1000

# Generate trace
npm test -- --trace=on
```

## 📄 License

This testing framework is part of the MCP.Guard project and follows the same license terms.

---

🎭 **Happy Testing!** For questions or issues, please check the MCP.Guard main repository or create a new issue.