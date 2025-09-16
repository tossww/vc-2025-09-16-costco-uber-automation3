# Testing Strategy

**Last Updated:** [Date]
**Version:** 1.0
**Owner:** [Your Name]

## Testing Philosophy

### Core Principles
1. **Progressive Testing** - Start simple, add complexity as features mature
2. **Test What Matters** - Focus on critical paths and user-facing functionality
3. **Fast Feedback Loops** - Tests should run quickly and fail fast
4. **Maintainable Tests** - Tests are code too; keep them clean and focused
5. **Confidence over Coverage** - High confidence in core functionality beats 100% coverage of trivial code

### Anti-Patterns to Avoid
- **Testing Implementation Details** - Test behavior, not internal structure
- **Fragile Tests** - Tests that break with minor refactoring
- **Slow Test Suites** - Tests that take too long discourage frequent running
- **Test Pollution** - Tests that affect each other's state or outcomes

---

## Testing Pyramid

```
                   E2E Tests (5-10%)
                  /                \
              Integration Tests (20-30%)
             /                          \
         Unit Tests (60-70%)
```

### Unit Tests (60-70% of test suite)
**Purpose:** Test individual functions, classes, and modules in isolation

**What to Test:**
- Pure functions and business logic
- Data transformations and validation
- Error handling and edge cases
- Module interfaces and APIs

**Examples for Our Modules:**

```typescript
// Knowledge Module - Content Processing
describe('ContentProcessor', () => {
  it('should extract links from markdown content', () => {
    const processor = new ContentProcessor();
    const content = 'Check out [this link](https://example.com) and [[internal note]]';
    const result = processor.extractLinks(content);

    expect(result.external).toHaveLength(1);
    expect(result.internal).toHaveLength(1);
    expect(result.external[0].url).toBe('https://example.com');
  });

  it('should handle malformed markdown gracefully', () => {
    const processor = new ContentProcessor();
    const content = 'Broken markdown [link without closing](';

    expect(() => processor.extractLinks(content)).not.toThrow();
  });
});

// Processing Module - Email Classification
describe('EmailClassifier', () => {
  it('should classify urgent emails correctly', () => {
    const classifier = new EmailClassifier();
    const email = {
      subject: 'URGENT: Production system down',
      from: 'alerts@system.com',
      body: 'Critical error detected in production...'
    };

    const result = classifier.classify(email);
    expect(result.priority).toBe('high');
    expect(result.category).toBe('alert');
    expect(result.confidence).toBeGreaterThan(0.8);
  });
});

// Study Module - Spaced Repetition
describe('SpacedRepetitionScheduler', () => {
  it('should schedule next review based on performance', () => {
    const scheduler = new SpacedRepetitionScheduler();
    const card = createMockFlashcard();

    const result = scheduler.scheduleNext(card, 'correct');

    expect(result.nextReview).toBeInstanceOf(Date);
    expect(result.interval).toBeGreaterThan(card.lastInterval);
  });
});
```

### Integration Tests (20-30% of test suite)
**Purpose:** Test how different modules work together

**What to Test:**
- API endpoints with database interactions
- Event flow between modules
- External service integrations
- Data persistence and retrieval

**Examples:**

```typescript
// Knowledge Module Integration
describe('Content API Integration', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  it('should create content and generate search indices', async () => {
    const contentAPI = new ContentAPI();
    const searchAPI = new SearchAPI();

    const content = await contentAPI.create({
      title: 'Test Note',
      body: 'This is a test note about machine learning',
      tags: ['ai', 'ml']
    });

    // Wait for async indexing
    await waitFor(() => searchAPI.isIndexed(content.id));

    const searchResults = await searchAPI.search('machine learning');
    expect(searchResults.items).toContainEqual(
      expect.objectContaining({ id: content.id })
    );
  });
});

// Cross-Module Event Integration
describe('Content Processing Events', () => {
  it('should trigger processing when content is created', async () => {
    const eventBus = new EventBus();
    const contentAPI = new ContentAPI(eventBus);
    const processingModule = new ProcessingModule(eventBus);

    const processingPromise = new Promise((resolve) => {
      processingModule.on('content.processed', resolve);
    });

    await contentAPI.create({
      title: 'New Article',
      body: 'Article content with important keywords'
    });

    const processedEvent = await processingPromise;
    expect(processedEvent.extractedKeywords).toContain('important');
  });
});
```

### End-to-End Tests (5-10% of test suite)
**Purpose:** Test complete user workflows from UI to database

**What to Test:**
- Critical user journeys
- Cross-browser compatibility (if web-based)
- Performance under realistic conditions

**Examples:**

```typescript
// Second Brain User Journey
describe('Knowledge Management Workflow', () => {
  it('should allow user to capture, process, and retrieve content', async () => {
    const browser = await launchBrowser();
    const page = await browser.newPage();

    // Navigate to application
    await page.goto('http://localhost:3000');

    // Create new note
    await page.click('[data-testid="new-note-button"]');
    await page.fill('[data-testid="note-title"]', 'Meeting Notes');
    await page.fill('[data-testid="note-body"]', 'Discussed project architecture and database design');
    await page.click('[data-testid="save-note"]');

    // Wait for processing
    await page.waitForSelector('[data-testid="processing-complete"]');

    // Search for the note
    await page.fill('[data-testid="search-input"]', 'architecture');
    await page.press('[data-testid="search-input"]', 'Enter');

    // Verify note appears in search results
    const searchResults = await page.locator('[data-testid="search-results"] .note-item');
    await expect(searchResults.first()).toContainText('Meeting Notes');

    await browser.close();
  });
});

// Study App Learning Flow
describe('Spaced Repetition Study Session', () => {
  it('should present cards and update scheduling based on performance', async () => {
    const browser = await launchBrowser();
    const page = await browser.newPage();

    await page.goto('http://localhost:3000/study');

    // Start study session
    await page.click('[data-testid="start-session"]');

    // Answer first card correctly
    await page.waitForSelector('[data-testid="flashcard"]');
    await page.click('[data-testid="show-answer"]');
    await page.click('[data-testid="correct-answer"]');

    // Verify next card is presented
    await page.waitForSelector('[data-testid="flashcard"]:not(.answered)');

    // Complete session and verify scheduling
    await completeSession(page);

    const nextSessionDate = await page.textContent('[data-testid="next-session"]');
    expect(new Date(nextSessionDate)).toBeAfter(new Date());

    await browser.close();
  });
});
```

---

## Module-Specific Testing Strategies

### Knowledge Module Testing

#### Content Processing
```typescript
describe('Content Processing Pipeline', () => {
  // Test content ingestion from various sources
  test('web clipper content processing', async () => {
    const webClipper = new WebClipperProcessor();
    const rawHtml = '<article><h1>Title</h1><p>Content</p></article>';

    const processed = await webClipper.process(rawHtml, {
      url: 'https://example.com/article',
      timestamp: new Date()
    });

    expect(processed.title).toBe('Title');
    expect(processed.cleanContent).toBe('Content');
    expect(processed.metadata.source).toBe('web_clip');
  });

  // Test link extraction and relationship building
  test('automatic link detection', () => {
    const linkExtractor = new LinkExtractor();
    const content = 'Related to [[Project Planning]] and [external link](https://example.com)';

    const links = linkExtractor.extract(content);

    expect(links.internal).toHaveLength(1);
    expect(links.external).toHaveLength(1);
    expect(links.internal[0].target).toBe('Project Planning');
  });
});
```

#### Search and Retrieval
```typescript
describe('Search System', () => {
  test('semantic search with embeddings', async () => {
    const searchEngine = new SemanticSearchEngine();
    await seedTestContent([
      { title: 'Machine Learning Basics', content: 'Introduction to neural networks...' },
      { title: 'Cooking Recipes', content: 'How to make pasta...' }
    ]);

    const results = await searchEngine.search('artificial intelligence');

    expect(results[0].title).toBe('Machine Learning Basics');
    expect(results[0].relevanceScore).toBeGreaterThan(0.7);
  });

  test('full-text search with ranking', async () => {
    const searchEngine = new FullTextSearchEngine();

    const results = await searchEngine.search('neural networks');

    expect(results).toBeOrderedBy('relevanceScore', 'desc');
    expect(results.every(r => r.relevanceScore > 0)).toBe(true);
  });
});
```

### Processing Module Testing

#### Email Classification
```typescript
describe('Email Triage System', () => {
  test('priority classification accuracy', () => {
    const classifier = new EmailPriorityClassifier();
    const testEmails = loadTestEmailDataset();

    const results = testEmails.map(email => ({
      predicted: classifier.classify(email).priority,
      actual: email.actualPriority
    }));

    const accuracy = calculateAccuracy(results);
    expect(accuracy).toBeGreaterThan(0.85);
  });

  test('classification confidence scoring', () => {
    const classifier = new EmailPriorityClassifier();
    const uncertainEmail = {
      subject: 'Meeting tomorrow',
      from: 'colleague@company.com',
      body: 'Short message about meeting'
    };

    const result = classifier.classify(uncertainEmail);

    expect(result.confidence).toBeLessThan(0.8); // Should be uncertain
    expect(result.alternativeClassifications).toHaveLength(2);
  });
});
```

#### Data Processing Pipelines
```typescript
describe('Content Processing Pipeline', () => {
  test('pipeline fault tolerance', async () => {
    const pipeline = new ProcessingPipeline();
    const faultyProcessor = jest.fn().mockRejectedValue(new Error('Processing failed'));

    pipeline.addStep(faultyProcessor);
    pipeline.addStep(jest.fn()); // This should still run

    const result = await pipeline.process(testData);

    expect(result.errors).toHaveLength(1);
    expect(result.processedSteps).toHaveLength(1); // Second step should still execute
  });

  test('pipeline performance under load', async () => {
    const pipeline = new ProcessingPipeline({ maxConcurrency: 5 });
    const largeDataset = generateTestData(1000);

    const startTime = Date.now();
    const results = await pipeline.processBatch(largeDataset);
    const duration = Date.now() - startTime;

    expect(results).toHaveLength(1000);
    expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
  });
});
```

### Study Module Testing

#### Spaced Repetition Algorithm
```typescript
describe('Spaced Repetition Scheduler', () => {
  test('interval calculation based on performance', () => {
    const scheduler = new SM2Scheduler();
    const card = createFlashcard({ easiness: 2.5, interval: 1 });

    // Simulate correct answer
    const result = scheduler.update(card, 4);

    expect(result.interval).toBeGreaterThan(card.interval);
    expect(result.easiness).toBeGreaterThanOrEqual(card.easiness);
  });

  test('difficulty adjustment for struggling cards', () => {
    const scheduler = new SM2Scheduler();
    const card = createFlashcard({ easiness: 2.5, interval: 7 });

    // Simulate incorrect answer
    const result = scheduler.update(card, 1);

    expect(result.interval).toBe(1); // Reset to beginning
    expect(result.easiness).toBeLessThan(card.easiness);
  });
});
```

#### Learning Progress Tracking
```typescript
describe('Progress Analytics', () => {
  test('learning velocity calculation', () => {
    const tracker = new ProgressTracker();
    const sessions = generateStudySessions(30); // 30 days of sessions

    const velocity = tracker.calculateLearningVelocity(sessions);

    expect(velocity.cardsPerDay).toBeGreaterThan(0);
    expect(velocity.trend).toMatch(/increasing|stable|decreasing/);
  });

  test('knowledge retention estimation', () => {
    const tracker = new ProgressTracker();
    const cardHistory = generateCardHistory({
      totalReviews: 10,
      correctAnswers: 8
    });

    const retention = tracker.estimateRetention(cardHistory);

    expect(retention.currentLevel).toBeBetween(0, 1);
    expect(retention.projectedDecay).toBeInstanceOf(Date);
  });
});
```

---

## Testing Infrastructure

### Test Environment Setup

#### Database Testing
```typescript
// Setup test database with clean state
export async function setupTestDatabase() {
  const testDb = createTestConnection();
  await testDb.migrate.latest();
  await testDb.seed.run();
  return testDb;
}

export async function cleanupTestDatabase(db: Database) {
  await db.raw('TRUNCATE TABLE users, content, links, study_sessions RESTART IDENTITY CASCADE');
}

// Use transactions for test isolation
export function withTestTransaction(testFn: (db: Database) => Promise<void>) {
  return async () => {
    const db = await setupTestDatabase();
    const trx = await db.transaction();

    try {
      await testFn(trx);
    } finally {
      await trx.rollback();
      await db.destroy();
    }
  };
}
```

#### Event System Testing
```typescript
// Mock event bus for testing
export class MockEventBus implements EventBus {
  private events: Array<{ type: string; data: any }> = [];

  emit(eventType: string, data: any): void {
    this.events.push({ type: eventType, data });
  }

  getEvents(type?: string): Array<{ type: string; data: any }> {
    return type ? this.events.filter(e => e.type === type) : this.events;
  }

  clear(): void {
    this.events = [];
  }
}
```

#### External Service Mocking
```typescript
// Mock external APIs for consistent testing
export function mockOpenAIService() {
  return {
    generateEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    classifyText: jest.fn().mockResolvedValue({
      category: 'technical',
      confidence: 0.89
    })
  };
}

export function mockEmailService() {
  return {
    fetchEmails: jest.fn().mockResolvedValue([
      { id: '1', subject: 'Test', from: 'test@example.com' }
    ]),
    sendEmail: jest.fn().mockResolvedValue({ messageId: 'abc123' })
  };
}
```

### Test Data Management

#### Fixtures and Factories
```typescript
// Content factory for consistent test data
export const ContentFactory = {
  create: (overrides: Partial<Content> = {}): Content => ({
    id: randomUUID(),
    title: 'Test Content',
    body: 'This is test content for unit testing.',
    contentType: 'note',
    tags: ['test'],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }),

  createMany: (count: number, overrides?: Partial<Content>): Content[] => {
    return Array.from({ length: count }, () => ContentFactory.create(overrides));
  }
};

// Study session factory
export const StudySessionFactory = {
  create: (overrides: Partial<StudySession> = {}): StudySession => ({
    id: randomUUID(),
    userId: 'test-user',
    startTime: new Date(),
    endTime: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes later
    cardsReviewed: 20,
    correctAnswers: 16,
    ...overrides
  })
};
```

---

## Testing Workflow

### Development Workflow
1. **Red-Green-Refactor Cycle**
   - Write failing test first
   - Implement minimal code to pass
   - Refactor while keeping tests green

2. **Test-Driven Development for Core Features**
   - Start with acceptance criteria from PRD
   - Write integration tests for happy paths
   - Write unit tests for edge cases and error handling

3. **Testing Before Refactoring**
   - Ensure good test coverage before refactoring
   - Run full test suite after changes
   - Update tests when behavior intentionally changes

### Continuous Integration
```yaml
# Example CI pipeline
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run linting
        run: npm run lint

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db

      - name: Run E2E tests
        run: npm run test:e2e
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
```

### Performance Testing

#### Load Testing for Processing Pipelines
```typescript
describe('Processing Pipeline Performance', () => {
  test('handles high-volume content processing', async () => {
    const pipeline = new ContentProcessingPipeline();
    const content = ContentFactory.createMany(1000);

    const startTime = performance.now();
    const results = await pipeline.processBatch(content);
    const endTime = performance.now();

    const processingTime = endTime - startTime;
    const itemsPerSecond = content.length / (processingTime / 1000);

    expect(itemsPerSecond).toBeGreaterThan(10); // Should process at least 10 items/second
    expect(results.filter(r => r.success)).toHaveLength(content.length);
  });
});
```

#### Memory Usage Testing
```typescript
describe('Memory Usage', () => {
  test('does not leak memory during batch processing', async () => {
    const initialMemory = process.memoryUsage().heapUsed;

    for (let i = 0; i < 10; i++) {
      const content = ContentFactory.createMany(100);
      await processContent(content);

      // Force garbage collection if available
      if (global.gc) global.gc();
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;

    // Memory shouldn't increase by more than 10MB
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
  });
});
```

---

## Quality Gates

### Before Code Review
- [ ] All tests pass locally
- [ ] New tests added for new functionality
- [ ] Test coverage maintained or improved
- [ ] No obvious test smells (too complex, testing implementation details)

### Before Merge
- [ ] All CI tests pass
- [ ] Integration tests validate feature works end-to-end
- [ ] Performance tests show no regression
- [ ] Security tests pass (if applicable)

### Before Deployment
- [ ] Full test suite passes in staging environment
- [ ] E2E tests validate critical user journeys
- [ ] Load tests confirm performance under expected traffic
- [ ] Rollback plan tested and ready

---

## Maintenance and Evolution

### Test Health Monitoring
- **Flaky Test Detection**: Track tests that fail intermittently
- **Test Performance**: Monitor test suite execution time
- **Coverage Trends**: Track coverage changes over time
- **Test Quality**: Review test complexity and maintainability

### Periodic Reviews
- **Monthly**: Review failing tests and fix or remove
- **Quarterly**: Audit test coverage and identify gaps
- **Semi-annually**: Review testing strategy effectiveness
- **Annually**: Evaluate and update testing tools and practices

### Test Deprecation
- Mark tests as deprecated before removal
- Ensure functionality is covered by other tests
- Update documentation to reflect changes
- Communicate test changes to team members

---

*Remember: Tests are a safety net that enables confident refactoring and rapid feature development. Invest in them early and maintain them diligently.*