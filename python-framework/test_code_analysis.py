#!/usr/bin/env python3
"""
Test Suite für Code Analysis Plugin
Tests the Python-based code analysis functionality
"""

import pytest
import asyncio
import tempfile
import os
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any

# Import the code analysis plugin
from code_analysis_plugin import (
    CodeAnalysisPlugin, CodeIssue, CodeLocation, CodeAnalysisResult,
    ProblemSeverity
)
from main import Problem


class TestCodeAnalysisPlugin:
    """Test suite for the Code Analysis Plugin"""
    
    @pytest.fixture
    def plugin(self):
        """Create a fresh plugin instance for each test"""
        return CodeAnalysisPlugin()
    
    @pytest.fixture
    def temp_code_dir(self):
        """Create a temporary directory with test code files"""
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Create test JavaScript file with issues
            js_file = temp_path / "test.js"
            js_file.write_text("""
function calculatePrice(items {  // Missing closing parenthesis
    const secret = "hardcoded123";  // Security issue
    let total = 0
    for(let i=0; i<items.length; i++) {
        total += items[i].price * 1.15  // Missing semicolon, magic number
    }
    return total
}

function processOrder() {
    const query = "SELECT * FROM orders WHERE id = '" + orderId + "'";  // SQL injection
    return database.query(query);
}
""")
            
            # Create test Python file with issues
            py_file = temp_path / "test.py"
            py_file.write_text("""
import os
import subprocess

def process_user_input(user_input):
    # Security issue: command injection
    result = subprocess.run(f"echo {user_input}", shell=True)
    
    # Performance issue: synchronous file operation in loop
    files = []
    for i in range(100):
        with open(f"file_{i}.txt", "r") as f:  # Inefficient file handling
            files.append(f.read())
    
    # Logic error: variable used before assignment
    if some_condition:
        total = calculate_total()
    return total  # total might not be defined

def vulnerable_function():
    password = "admin123"  # Hardcoded password
    return password
""")
            
            # Create TypeScript file
            ts_file = temp_path / "test.ts"
            ts_file.write_text("""
interface User {
    name: string;
    email: string;
}

function processUser(user: User): string {
    // XSS vulnerability
    document.getElementById('output').innerHTML = user.name + " processed";
    
    // Performance issue: inefficient array operations
    const items = getItems();
    const processed = [];
    for(let i = 0; i < items.length; i++) {
        processed.push(expensiveOperation(items[i]));
    }
    
    return "done"
}
""")
            
            yield temp_path
    
    @pytest.mark.asyncio
    async def test_plugin_initialization(self, plugin):
        """Test plugin initialization"""
        config = {
            'source_directories': ['/tmp/test'],
            'confidence_threshold': 0.8
        }
        
        result = await plugin.initialize(config)
        assert result is True
        assert plugin.confidence_threshold == 0.8
        assert '/tmp/test' in plugin.source_directories
    
    @pytest.mark.asyncio
    async def test_javascript_syntax_error_detection(self, plugin, temp_code_dir):
        """Test detection of JavaScript syntax errors"""
        config = {'source_directories': [str(temp_code_dir)]}
        await plugin.initialize(config)
        
        # Simulate error log that could trigger code analysis
        metrics = {
            'recent_log_entries': [
                {
                    'level': 'ERROR',
                    'message': 'SyntaxError: Unexpected token { in test.js:2'
                }
            ]
        }
        
        problems = await plugin.detect_problems(metrics, [])
        
        assert len(problems) > 0
        syntax_problems = [p for p in problems if 'syntax' in p.type.lower()]
        assert len(syntax_problems) > 0
        
        # Check problem details
        syntax_problem = syntax_problems[0]
        assert syntax_problem.severity in [ProblemSeverity.HIGH, ProblemSeverity.CRITICAL]
        assert 'test.js' in syntax_problem.metadata.get('code_location', {}).get('file_path', '')
    
    @pytest.mark.asyncio
    async def test_security_issue_detection(self, plugin, temp_code_dir):
        """Test detection of security vulnerabilities"""
        config = {'source_directories': [str(temp_code_dir)]}
        await plugin.initialize(config)
        
        # Simulate security-related error
        metrics = {
            'recent_log_entries': [
                {
                    'level': 'ERROR',
                    'message': 'Potential SQL injection detected in processOrder function'
                }
            ]
        }
        
        problems = await plugin.detect_problems(metrics, [])
        security_problems = [p for p in problems if 'security' in p.type.lower()]
        
        assert len(security_problems) > 0
        security_problem = security_problems[0]
        assert security_problem.severity == ProblemSeverity.CRITICAL
        assert security_problem.metadata.get('confidence', 0) > 0.7
    
    @pytest.mark.asyncio
    async def test_performance_issue_detection(self, plugin, temp_code_dir):
        """Test detection of performance issues"""
        config = {'source_directories': [str(temp_code_dir)]}
        await plugin.initialize(config)
        
        metrics = {
            'recent_log_entries': [
                {
                    'level': 'ERROR',
                    'message': 'Performance degradation detected in file operations'
                }
            ]
        }
        
        problems = await plugin.detect_problems(metrics, [])
        perf_problems = [p for p in problems if 'performance' in p.type.lower()]
        
        assert len(perf_problems) > 0
        perf_problem = perf_problems[0]
        assert perf_problem.severity in [ProblemSeverity.MEDIUM, ProblemSeverity.HIGH]
    
    @pytest.mark.asyncio
    async def test_multi_language_support(self, plugin, temp_code_dir):
        """Test analysis of multiple programming languages"""
        config = {'source_directories': [str(temp_code_dir)]}
        await plugin.initialize(config)
        
        # Check that plugin found files of different types
        assert len(plugin.code_index) > 0
        
        file_extensions = set()
        for file_path in plugin.code_index.keys():
            ext = Path(file_path).suffix
            file_extensions.add(ext)
        
        # Should find .js, .py, .ts files
        expected_extensions = {'.js', '.py', '.ts'}
        assert expected_extensions.issubset(file_extensions)
    
    @pytest.mark.asyncio
    async def test_confidence_scoring(self, plugin):
        """Test confidence scoring for different types of issues"""
        # Test with clear syntax error (should have high confidence)
        clear_error_message = "SyntaxError: Unexpected token ) at line 42"
        issues = await plugin._analyze_error_message(clear_error_message)
        
        if issues:
            high_confidence_issue = issues[0]
            assert high_confidence_issue.confidence > 0.8
        
        # Test with ambiguous error (should have lower confidence)
        ambiguous_message = "Something went wrong in the application"
        ambiguous_issues = await plugin._analyze_error_message(ambiguous_message)
        
        # Should produce fewer or less confident issues
        if ambiguous_issues:
            assert all(issue.confidence < 0.9 for issue in ambiguous_issues)
    
    @pytest.mark.asyncio
    async def test_suggested_fixes(self, plugin, temp_code_dir):
        """Test that suggested fixes are provided for detected issues"""
        config = {'source_directories': [str(temp_code_dir)]}
        await plugin.initialize(config)
        
        metrics = {
            'recent_log_entries': [
                {
                    'level': 'ERROR',
                    'message': 'Missing semicolon at line 5 in test.js'
                }
            ]
        }
        
        problems = await plugin.detect_problems(metrics, [])
        
        for problem in problems:
            suggested_fix = problem.metadata.get('suggested_fix', '')
            assert isinstance(suggested_fix, str)
            assert len(suggested_fix) > 0  # Should provide some suggestion
    
    @pytest.mark.asyncio
    async def test_false_positive_handling(self, plugin):
        """Test that the plugin handles potential false positives appropriately"""
        # Test with log messages that shouldn't trigger code issues
        non_code_messages = [
            "User authentication failed",
            "Database connection timeout",
            "Network request failed",
            "File not found: config.txt"
        ]
        
        for message in non_code_messages:
            metrics = {'recent_log_entries': [{'level': 'ERROR', 'message': message}]}
            problems = await plugin.detect_problems(metrics, [])
            
            # Should either produce no problems or problems with lower confidence
            code_problems = [p for p in problems if 'code_issue' in p.type]
            if code_problems:
                assert all(p.metadata.get('confidence', 1.0) < 0.8 for p in code_problems)
    
    @pytest.mark.asyncio
    async def test_cleanup(self, plugin, temp_code_dir):
        """Test plugin cleanup functionality"""
        config = {'source_directories': [str(temp_code_dir)]}
        await plugin.initialize(config)
        
        # Verify plugin has indexed files
        assert len(plugin.code_index) > 0
        assert len(plugin.function_map) >= 0
        
        # Test cleanup
        await plugin.cleanup()
        
        assert len(plugin.code_index) == 0
        assert len(plugin.function_map) == 0
    
    @pytest.mark.asyncio
    async def test_error_handling(self, plugin):
        """Test plugin behavior with invalid configurations and errors"""
        # Test with non-existent directory
        config = {'source_directories': ['/non/existent/path']}
        result = await plugin.initialize(config)
        
        # Should still initialize successfully but log warnings
        assert result is True
        
        # Test with malformed log entries
        malformed_metrics = {
            'recent_log_entries': [
                "not a dict",  # Invalid format
                {'level': 'ERROR'},  # Missing message
                {'message': 'test'},  # Missing level
                {'level': 'ERROR', 'message': None}  # None message
            ]
        }
        
        # Should not crash
        problems = await plugin.detect_problems(malformed_metrics, [])
        assert isinstance(problems, list)
    
    def test_code_location_creation(self):
        """Test CodeLocation data structure"""
        location = CodeLocation(
            file_path="/path/to/file.js",
            line_number=42,
            column_number=15,
            function_name="calculateTotal",
            class_name="Calculator"
        )
        
        assert location.file_path == "/path/to/file.js"
        assert location.line_number == 42
        assert location.column_number == 15
        assert location.function_name == "calculateTotal"
        assert location.class_name == "Calculator"
    
    def test_code_issue_creation(self):
        """Test CodeIssue data structure"""
        location = CodeLocation(
            file_path="test.js",
            line_number=10,
            function_name="testFunction"
        )
        
        issue = CodeIssue(
            issue_type="syntax_error",
            severity=ProblemSeverity.HIGH,
            description="Missing semicolon",
            location=location,
            confidence=0.95,
            suggested_fix="Add semicolon at end of statement",
            metadata={"pattern": "missing_semicolon"}
        )
        
        assert issue.issue_type == "syntax_error"
        assert issue.severity == ProblemSeverity.HIGH
        assert issue.confidence == 0.95
        assert issue.location.file_path == "test.js"
        assert "semicolon" in issue.suggested_fix
    
    @pytest.mark.asyncio
    async def test_batch_analysis_performance(self, plugin, temp_code_dir):
        """Test plugin performance with multiple files"""
        # Create additional test files
        for i in range(10):
            test_file = temp_code_dir / f"perf_test_{i}.js"
            test_file.write_text(f"""
            function test{i}() {{
                const value = {i * 10};  // Magic number
                return value
            }}
            """)
        
        config = {'source_directories': [str(temp_code_dir)]}
        
        start_time = datetime.now()
        await plugin.initialize(config)
        end_time = datetime.now()
        
        # Initialization should complete in reasonable time
        duration = (end_time - start_time).total_seconds()
        assert duration < 5.0  # Should complete within 5 seconds
        
        # Should have indexed multiple files
        assert len(plugin.code_index) > 10
    
    @pytest.mark.asyncio
    async def test_real_world_error_patterns(self, plugin):
        """Test with real-world error message patterns"""
        real_error_messages = [
            "TypeError: Cannot read property 'name' of undefined at processUser (app.js:42:15)",
            "ReferenceError: calculateTotal is not defined at main.js:18:5",
            "SyntaxError: Unexpected token '}' in config.json:25",
            "Error: ENOENT: no such file or directory, open 'missing.txt'",
            "Warning: Each child in a list should have a unique 'key' prop",
            "ESLint: 'unused-variable' Variable 'data' is defined but never used",
            "SecurityError: Blocked a frame with origin from accessing a cross-origin frame"
        ]
        
        for error_message in real_error_messages:
            metrics = {
                'recent_log_entries': [
                    {'level': 'ERROR', 'message': error_message}
                ]
            }
            
            problems = await plugin.detect_problems(metrics, [])
            
            # Should handle each message without crashing
            assert isinstance(problems, list)
            
            # Code-related errors should produce problems
            if any(keyword in error_message.lower() for keyword in 
                   ['syntaxerror', 'referenceerror', 'typeerror', 'eslint']):
                assert len(problems) > 0
                code_problem = next(p for p in problems if 'code_issue' in p.type)
                assert code_problem.metadata.get('confidence', 0) > 0.5


class TestCodeIssueIntegration:
    """Integration tests for code issue detection with the monitoring framework"""
    
    @pytest.mark.asyncio
    async def test_end_to_end_code_analysis_workflow(self, temp_code_dir):
        """Test complete workflow from error detection to problem creation"""
        plugin = CodeAnalysisPlugin([str(temp_code_dir)])
        
        # Initialize plugin
        config = {
            'source_directories': [str(temp_code_dir)],
            'confidence_threshold': 0.7
        }
        await plugin.initialize(config)
        
        # Simulate system detecting errors in logs
        system_metrics = {
            'recent_log_entries': [
                {
                    'level': 'ERROR',
                    'message': 'SyntaxError: Unexpected token { at test.js:2:24',
                    'timestamp': datetime.now().isoformat(),
                    'source': 'javascript_engine'
                },
                {
                    'level': 'CRITICAL',
                    'message': 'Potential SQL injection in query: SELECT * FROM users WHERE id = user_input',
                    'timestamp': datetime.now().isoformat(),
                    'source': 'security_scanner'
                }
            ]
        }
        
        # Plugin detects problems
        detected_problems = await plugin.detect_problems(system_metrics, [])
        
        # Verify problems were detected
        assert len(detected_problems) > 0
        
        # Verify problem structure
        for problem in detected_problems:
            assert hasattr(problem, 'type')
            assert hasattr(problem, 'severity')
            assert hasattr(problem, 'description')
            assert hasattr(problem, 'timestamp')
            assert hasattr(problem, 'metadata')
            
            # Verify metadata contains code analysis info
            metadata = problem.metadata
            assert 'code_location' in metadata
            assert 'confidence' in metadata
            assert 'suggested_fix' in metadata
            assert 'source' in metadata
            
            # Verify code location info
            code_location = metadata['code_location']
            assert 'file_path' in code_location
            assert 'line_number' in code_location
        
        # Cleanup
        await plugin.cleanup()
    
    @pytest.mark.asyncio
    async def test_integration_with_monitoring_metrics(self):
        """Test integration with broader system monitoring metrics"""
        plugin = CodeAnalysisPlugin()
        
        # Simulate comprehensive system metrics
        comprehensive_metrics = {
            'cpu_usage': 85.5,
            'memory_usage': 78.2,
            'error_count': 15,
            'response_time': 450,
            'recent_log_entries': [
                {
                    'level': 'ERROR',
                    'message': 'Unhandled Promise rejection: ReferenceError: undefinedFunction is not defined',
                    'timestamp': datetime.now().isoformat(),
                    'source': 'node_process'
                },
                {
                    'level': 'WARN',
                    'message': 'Memory usage approaching limit due to potential memory leak',
                    'timestamp': datetime.now().isoformat(),
                    'source': 'memory_monitor'
                }
            ],
            'active_connections': 150,
            'request_count': 1250
        }
        
        # Plugin should focus on log entries for code analysis
        problems = await plugin.detect_problems(comprehensive_metrics, [])
        
        # Should detect code-related problems from log entries
        code_problems = [p for p in problems if 'code_issue' in p.type]
        assert len(code_problems) > 0
        
        # Problems should have appropriate metadata for monitoring integration
        for problem in code_problems:
            assert problem.metadata.get('source') == 'code_analysis_plugin'
            assert 'confidence' in problem.metadata
            assert 0.0 <= problem.metadata['confidence'] <= 1.0


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v", "--tb=short"])