# Test Manager Integration Documentation

## Overview

The IMF Test Manager has been successfully integrated into the main IMF system, providing comprehensive test data generation capabilities for ML training and system testing.

## Architecture

### Backend Integration

#### Service Layer
- **TestManagerService** (`server/services/test-manager.service.ts`)
  - Manages test profiles and data generation
  - Handles workspace creation and management
  - Provides process-based integration with the external test manager
  - Supports concurrent test data generation with configurable limits

#### API Layer
- **TestManagerController** (`server/controllers/test-manager.controller.ts`)
  - RESTful API endpoints for profile management
  - Test data generation triggers
  - Status monitoring and health checks
  - Template and utility endpoints

#### Routes
- **GET /api/test-manager/profiles** - List all test profiles
- **POST /api/test-manager/profiles** - Create new test profile
- **GET /api/test-manager/profiles/:id** - Get specific profile
- **PUT /api/test-manager/profiles/:id** - Update profile
- **DELETE /api/test-manager/profiles/:id** - Delete profile
- **POST /api/test-manager/profiles/:id/generate** - Generate test data
- **GET /api/test-manager/generated-data** - List generated datasets
- **GET /api/test-manager/status** - Service status
- **GET /api/test-manager/health** - Health check
- **GET /api/test-manager/templates** - Profile templates
- **GET /api/test-manager/problem-types** - Available problem types

### Frontend Integration

#### UI Components
- **TestManager Page** (`client/src/pages/test-manager.tsx`)
  - Full-featured test manager interface
  - Profile creation and management
  - Data generation monitoring
  - Template-based profile creation

#### Dashboard Integration
- **TestManagerWidget** (`client/src/components/dashboard/test-manager-widget.tsx`)
  - Dashboard widget showing test manager status
  - Quick access to recent profiles and generated data
  - Real-time status updates

#### Navigation
- Added "Test Manager" menu item in the sidebar
- Accessible at `/test-manager` route

## Configuration

### Environment Variables

```bash
# Test Manager Configuration
TEST_MANAGER_ENABLED=true
TEST_MANAGER_PATH=/Users/simonjanke/Projects/imf-test-manager
TEST_MANAGER_WORKSPACE=./test-workspace
TEST_MANAGER_TIMEOUT=60000
TEST_MANAGER_MAX_CONCURRENT=3
```

### Configuration Schema
- **TEST_MANAGER_ENABLED**: Enable/disable test manager integration
- **TEST_MANAGER_PATH**: Path to the external test manager project
- **TEST_MANAGER_WORKSPACE**: Workspace directory for profiles and generated data
- **TEST_MANAGER_TIMEOUT**: Timeout for test data generation (milliseconds)
- **TEST_MANAGER_MAX_CONCURRENT**: Maximum concurrent generations

## Features

### Test Profile Management
- Create custom test profiles with specific configurations
- Support for multiple programming languages (TypeScript, JavaScript, Python)
- Configurable complexity levels (low, medium, high)
- Scenario-based testing with different problem types

### Test Data Generation
- Real-time test data generation with progress tracking
- Support for various problem types:
  - Null pointer errors
  - Memory leaks
  - API timeouts
  - Logic errors
  - Security vulnerabilities
  - Performance issues
  - Type mismatches
  - Syntax errors

### ML Training Data
- Structured data generation suitable for ML model training
- Realistic code problems with fix suggestions
- Comprehensive metrics and log data
- Configurable sample sizes and complexity

### Dashboard Integration
- Real-time status monitoring
- Quick access to recent profiles and datasets
- Generation progress tracking
- System capacity monitoring

## Usage

### Creating a Test Profile

1. Navigate to the Test Manager page
2. Click "Create Profile"
3. Fill in the profile details:
   - Name and description
   - Source directories
   - Programming languages
   - Complexity level
   - Problem types to include
4. Click "Create Profile"

### Generating Test Data

1. From the profiles list, click "Generate" on a profile
2. Monitor the generation progress
3. View the generated dataset once complete
4. Export or download the data as needed

### Using Templates

1. Go to the "Templates" tab
2. Choose from predefined templates:
   - Basic Performance Testing
   - Basic Security Testing
   - ML Training Data Generation
3. Click "Use Template" to create a profile from the template

## Integration Benefits

### For Development Teams
- Automated test data generation
- Realistic testing scenarios
- Reduced manual test data creation effort
- Consistent data quality

### For ML Training
- Large-scale training data generation
- Diverse problem scenarios
- Labeled data with fix suggestions
- Configurable data distribution

### For System Testing
- Performance testing with realistic load patterns
- Security testing with vulnerability patterns
- Integration testing with multi-system scenarios
- Regression testing with baseline comparisons

## Error Handling

The integration includes comprehensive error handling:

- **Service Unavailability**: Graceful degradation when test manager is not available
- **Generation Failures**: Detailed error reporting and recovery
- **Timeout Handling**: Configurable timeouts with proper cleanup
- **Capacity Management**: Prevention of system overload with concurrent limits
- **API Error Responses**: Structured error responses with meaningful messages

## Monitoring and Status

### Health Checks
- Service availability monitoring
- Workspace accessibility checks
- Process capacity monitoring
- Error rate tracking

### Real-time Updates
- WebSocket-based status updates
- Generation progress tracking
- Capacity monitoring
- Error notifications

## Future Enhancements

### Planned Features
- Advanced scheduling for data generation
- Integration with CI/CD pipelines
- Advanced analytics and reporting
- Custom problem type definitions
- Batch profile operations
- Data versioning and history

### Scalability
- Distributed generation support
- Cloud storage integration
- Advanced caching strategies
- Performance optimizations

## Technical Details

### Dependencies
- Express.js for API endpoints
- React/TypeScript for UI components
- Node.js child processes for test manager integration
- File system operations for workspace management

### Security
- Input validation on all endpoints
- Workspace isolation
- Process security measures
- Error information sanitization

### Performance
- Concurrent generation support
- Efficient file operations
- Optimized API responses
- Client-side caching

## Troubleshooting

### Common Issues

1. **Service Not Available**: Check TEST_MANAGER_ENABLED and path configuration
2. **Generation Failures**: Verify workspace permissions and disk space
3. **Timeout Errors**: Increase TEST_MANAGER_TIMEOUT value
4. **Capacity Issues**: Adjust TEST_MANAGER_MAX_CONCURRENT setting

### Logs and Debugging
- Service initialization logs
- Generation process logs
- API request/response logs
- Error tracking and reporting

## Conclusion

The Test Manager integration provides a powerful, scalable solution for test data generation within the IMF system. It combines the flexibility of the external test manager with seamless integration into the main system, offering both UI and API access to comprehensive testing capabilities.