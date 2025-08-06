#!/usr/bin/env python3
"""
Code Analysis Plugin for Intelligent Monitoring Framework
Provides automated code analysis, issue detection, and fix suggestions
"""

import ast
import re
import os
import shutil
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict, field
from datetime import datetime
from abc import ABC, abstractmethod
import json
import logging

logger = logging.getLogger(__name__)

# Import framework interfaces
from main import (
    PluginInterface, MetricsCollectorPlugin, ProblemDetectorPlugin, RemediationPlugin,
    Problem, ProblemSeverity, LogEntry
)

# ============================================================================
# CODE ANALYSIS DATA STRUCTURES
# ============================================================================

@dataclass
class CodeLocation:
    """Represents a location in code"""
    file_path: str
    line_number: int
    column_number: int = 0
    function_name: str = ""
    class_name: str = ""

@dataclass
class CodeIssue:
    """Represents a detected code issue"""
    issue_type: str  # syntax_error, logic_error, security_issue, performance_issue
    severity: ProblemSeverity
    description: str
    location: CodeLocation
    confidence: float  # 0.0 to 1.0
    suggested_fix: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class CodeAnalysisResult:
    """Results of code analysis"""
    files_analyzed: int
    issues_found: List[CodeIssue]
    duration_ms: int
    timestamp: datetime
    metadata: Dict[str, Any] = field(default_factory=dict)

# ============================================================================
# CODE ANALYSIS PLUGIN
# ============================================================================

class CodeAnalysisPlugin(ProblemDetectorPlugin):
    """Plugin for analyzing code and detecting issues"""
    
    def __init__(self, source_directories: List[str] = None):
        self.source_directories = source_directories if source_directories is not None else []
        self.code_index = {}
        self.function_map = {}
        self.error_patterns = []
        self.confidence_threshold = 0.7
        self._initialize_patterns()
    
    @property
    def name(self) -> str:
        return "code_analysis_detector"
    
    @property
    def version(self) -> str:
        return "1.0.0"
    
    async def initialize(self, config: Dict[str, Any]) -> bool:
        """Initialize the code analysis plugin"""
        self.source_directories = config.get('source_directories', self.source_directories)
        self.confidence_threshold = config.get('confidence_threshold', 0.7)
        
        logger.info(f"Initializing code analysis for {len(self.source_directories)} directories")
        
        # Build code index
        await self._build_code_index()
        
        logger.info(f"Code analysis initialized: {len(self.code_index)} files indexed")
        return True
    
    async def cleanup(self) -> None:
        """Cleanup resources"""
        self.code_index.clear()
        self.function_map.clear()
    
    async def detect_problems(self, metrics: Dict[str, Any], 
                            history: List[Dict[str, Any]]) -> List[Problem]:
        """Detect code-related problems from system metrics and logs"""
        problems = []
        
        # Check if there are error logs that might be code-related
        log_entries = metrics.get('recent_log_entries', [])
        if not log_entries:
            return problems
        
        # Analyze recent error logs for code issues
        for log_entry in log_entries:
            if isinstance(log_entry, dict):
                level = log_entry.get('level', '').upper()
                message = log_entry.get('message', '')
                
                if level in ['ERROR', 'CRITICAL', 'FATAL']:
                    code_issues = await self._analyze_error_message(message)
                    for issue in code_issues:
                        problem = Problem(
                            type=f"code_issue_{issue.issue_type}",
                            severity=issue.severity,
                            description=f"Code issue detected: {issue.description}",
                            timestamp=datetime.now(),
                            metadata={
                                'code_location': asdict(issue.location),
                                'confidence': issue.confidence,
                                'suggested_fix': issue.suggested_fix,
                                'source': 'code_analysis_plugin'
                            }
                        )
                        problems.append(problem)
        
        return problems
    
    async def _build_code_index(self):
        """Build an index of all code files and their contents"""
        for directory in self.source_directories:
            dir_path = Path(directory)
            if not dir_path.exists():
                logger.warning(f"Source directory not found: {directory}")
                continue
            
            # Find all code files
            code_extensions = {'.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.cpp', '.c', '.h'}
            
            for file_path in dir_path.rglob('*'):
                if file_path.is_file() and file_path.suffix in code_extensions:
                    try:
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read()
                        
                        self.code_index[str(file_path)] = {
                            'content': content,
                            'lines': content.split('\n'),
                            'extension': file_path.suffix,
                            'size': len(content),
                            'last_modified': file_path.stat().st_mtime
                        }
                        
                        # Extract functions/methods
                        await self._extract_functions(str(file_path), content, file_path.suffix)
                        
                    except Exception as e:
                        logger.error(f"Error indexing {file_path}: {e}")
    
    async def _extract_functions(self, file_path: str, content: str, extension: str):
        """Extract function definitions from code"""
        if extension == '.py':
            await self._extract_python_functions(file_path, content)
        elif extension in ['.js', '.ts', '.jsx', '.tsx']:
            await self._extract_javascript_functions(file_path, content)
    
    async def _extract_python_functions(self, file_path: str, content: str):
        """Extract Python function definitions"""
        try:
            tree = ast.parse(content)
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    func_info = {
                        'file': file_path,
                        'name': node.name,
                        'line': node.lineno,
                        'args': [arg.arg for arg in node.args.args],
                        'type': 'function'
                    }
                    
                    if node.name not in self.function_map:
                        self.function_map[node.name] = []
                    self.function_map[node.name].append(func_info)
                
                elif isinstance(node, ast.ClassDef):
                    class_info = {
                        'file': file_path,
                        'name': node.name,
                        'line': node.lineno,
                        'type': 'class'
                    }
                    
                    if node.name not in self.function_map:
                        self.function_map[node.name] = []
                    self.function_map[node.name].append(class_info)
        
        except SyntaxError as e:
            logger.warning(f"Syntax error in {file_path}: {e}")
        except Exception as e:
            logger.error(f"Error parsing {file_path}: {e}")
    
    async def _extract_javascript_functions(self, file_path: str, content: str):
        """Extract JavaScript/TypeScript function definitions using regex"""
        # Simple regex patterns for function detection
        patterns = [
            r'function\s+(\w+)\s*\(',  # function name()
            r'(\w+)\s*:\s*function\s*\(',  # name: function()
            r'(\w+)\s*=>\s*{',  # arrow functions
            r'const\s+(\w+)\s*=\s*\(',  # const name = ()
            r'let\s+(\w+)\s*=\s*\(',  # let name = ()
            r'var\s+(\w+)\s*=\s*\(',  # var name = ()
        ]
        
        lines = content.split('\n')
        for line_num, line in enumerate(lines, 1):
            for pattern in patterns:
                matches = re.finditer(pattern, line)
                for match in matches:
                    func_name = match.group(1)
                    func_info = {
                        'file': file_path,
                        'name': func_name,
                        'line': line_num,
                        'type': 'function'
                    }
                    
                    if func_name not in self.function_map:
                        self.function_map[func_name] = []
                    self.function_map[func_name].append(func_info)
    
    def _initialize_patterns(self):
        """Initialize error patterns for code analysis"""
        self.error_patterns = [
            {
                'pattern': r'undefined.*function|function.*undefined',
                'type': 'undefined_function',
                'severity': ProblemSeverity.HIGH,
                'description': 'Undefined function call detected'
            },
            {
                'pattern': r'syntax.*error|invalid.*syntax',
                'type': 'syntax_error',
                'severity': ProblemSeverity.CRITICAL,
                'description': 'Syntax error in code'
            },
            {
                'pattern': r'null.*pointer|segmentation.*fault',
                'type': 'null_pointer',
                'severity': ProblemSeverity.CRITICAL,
                'description': 'Null pointer or segmentation fault'
            },
            {
                'pattern': r'memory.*leak|buffer.*overflow',
                'type': 'memory_issue',
                'severity': ProblemSeverity.HIGH,
                'description': 'Memory management issue'
            },
            {
                'pattern': r'timeout|deadlock|race.*condition',
                'type': 'concurrency_issue',
                'severity': ProblemSeverity.MEDIUM,
                'description': 'Concurrency or timing issue'
            }
        ]
    
    async def _analyze_error_message(self, message: str) -> List[CodeIssue]:
        """Analyze an error message for code issues"""
        if not message or not isinstance(message, str):
            return []
            
        issues = []
        
        for pattern_info in self.error_patterns:
            if re.search(pattern_info['pattern'], message, re.IGNORECASE):
                # Try to extract file and line information from message
                location = await self._extract_location_from_message(message)
                
                if not location:
                    # Create a generic location
                    location = CodeLocation(
                        file_path="unknown",
                        line_number=0,
                        function_name="unknown"
                    )
                
                issue = CodeIssue(
                    issue_type=pattern_info['type'],
                    severity=pattern_info['severity'],
                    description=pattern_info['description'],
                    location=location,
                    confidence=0.8,  # High confidence for pattern matches
                    suggested_fix=await self._generate_fix_suggestion(pattern_info['type'], message),
                    metadata={'original_message': message}
                )
                issues.append(issue)
        
        return issues
    
    async def _extract_location_from_message(self, message: str) -> Optional[CodeLocation]:
        """Extract file and line number from error message"""
        # Common patterns for file/line extraction
        patterns = [
            r'File "([^"]+)", line (\d+)',  # Python style
            r'at ([^:]+):(\d+):(\d+)',      # JavaScript style
            r'([^:]+):(\d+):(\d+)',         # Generic file:line:column
            r'([^:]+):(\d+)',               # Generic file:line
        ]
        
        for pattern in patterns:
            match = re.search(pattern, message)
            if match:
                file_path = match.group(1)
                line_number = int(match.group(2))
                column_number = int(match.group(3)) if len(match.groups()) >= 3 else 0
                
                return CodeLocation(
                    file_path=file_path,
                    line_number=line_number,
                    column_number=column_number
                )
        
        return None
    
    async def _generate_fix_suggestion(self, issue_type: str, message: str) -> str:
        """Generate a fix suggestion based on issue type"""
        suggestions = {
            'undefined_function': 'Check if the function is properly defined and imported. Verify function name spelling.',
            'syntax_error': 'Review the syntax around the reported line. Check for missing brackets, semicolons, or quotes.',
            'null_pointer': 'Add null checks before accessing object properties. Initialize variables properly.',
            'memory_issue': 'Review memory allocation and deallocation. Check for buffer bounds.',
            'concurrency_issue': 'Add proper synchronization mechanisms. Review shared resource access.'
        }
        
        return suggestions.get(issue_type, 'Review the code for potential issues related to this error.')

# ============================================================================
# CODE FIX REMEDIATION PLUGIN
# ============================================================================

class CodeFixRemediationPlugin(RemediationPlugin):
    """Plugin for automatically fixing code issues"""
    
    def __init__(self, source_directories: List[str], auto_apply: bool = False):
        self.source_directories = source_directories
        self.auto_apply = auto_apply
        self.backup_dir = "./backups"
        self.fix_history = []
    
    @property
    def name(self) -> str:
        return "code_fix_remediation"
    
    @property
    def version(self) -> str:
        return "1.0.0"
    
    async def initialize(self, config: Dict[str, Any]) -> bool:
        """Initialize the remediation plugin"""
        self.auto_apply = config.get('auto_apply', self.auto_apply)
        self.backup_dir = config.get('backup_dir', self.backup_dir)
        
        # Create backup directory
        Path(self.backup_dir).mkdir(parents=True, exist_ok=True)
        
        logger.info(f"Code fix remediation initialized (auto_apply: {self.auto_apply})")
        return True
    
    async def cleanup(self) -> None:
        """Cleanup resources"""
        pass
    
    async def can_handle_problem(self, problem: Problem) -> bool:
        """Check if this plugin can handle the given problem"""
        return problem.type.startswith('code_issue_')
    
    async def execute_remediation(self, problem: Problem, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute code fix remediation"""
        result = {
            'success': False,
            'action': 'code_fix',
            'details': {},
            'backup_created': False
        }
        
        try:
            # Extract code location from problem metadata
            code_location = problem.metadata.get('code_location', {})
            file_path = code_location.get('file_path', 'unknown')
            line_number = code_location.get('line_number', 0)
            
            if file_path == 'unknown' or not Path(file_path).exists():
                result['details']['error'] = 'File not found or invalid location'
                return result
            
            # Generate fix suggestion
            fix_suggestion = await self._generate_detailed_fix(problem, code_location)
            
            if not fix_suggestion:
                result['details']['error'] = 'Could not generate fix suggestion'
                return result
            
            result['fix_description'] = fix_suggestion['description']
            result['confidence'] = fix_suggestion['confidence']
            
            # If auto-apply is enabled and confidence is high enough
            if self.auto_apply and fix_suggestion['confidence'] > 0.8:
                # Create backup
                backup_path = await self._create_backup(file_path)
                result['backup_created'] = True
                result['backup_path'] = backup_path
                
                # Apply fix
                fix_applied = await self._apply_fix(file_path, line_number, fix_suggestion)
                
                if fix_applied:
                    result['success'] = True
                    result['details']['fix_applied'] = True
                    result['details']['original_line'] = fix_suggestion.get('original_code', '')
                    result['details']['fixed_line'] = fix_suggestion.get('fixed_code', '')
                    
                    # Record fix in history
                    self.fix_history.append({
                        'timestamp': datetime.now().isoformat(),
                        'file': file_path,
                        'line': line_number,
                        'problem_type': problem.type,
                        'fix_description': fix_suggestion['description']
                    })
                else:
                    result['details']['error'] = 'Failed to apply fix'
            else:
                # Just provide suggestion without applying
                result['success'] = True
                result['details']['fix_suggested'] = True
                result['details']['suggestion'] = fix_suggestion['description']
                result['code_fix'] = fix_suggestion
        
        except Exception as e:
            logger.error(f"Error in code fix remediation: {e}")
            result['details']['error'] = str(e)
        
        return result
    
    async def _generate_detailed_fix(self, problem: Problem, code_location: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Generate detailed fix for a code issue"""
        file_path = code_location.get('file_path', '')
        line_number = code_location.get('line_number', 0)
        
        if not Path(file_path).exists():
            return None
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            if line_number <= 0 or line_number > len(lines):
                return None
            
            original_line = lines[line_number - 1].rstrip()
            issue_type = problem.type.replace('code_issue_', '')
            
            # Generate fix based on issue type
            fix_info = await self._get_fix_for_issue_type(issue_type, original_line, file_path)
            
            if fix_info:
                return {
                    'description': fix_info['description'],
                    'original_code': original_line,
                    'fixed_code': fix_info['fixed_line'],
                    'confidence': fix_info['confidence'],
                    'reasoning': fix_info.get('reasoning', '')
                }
        
        except Exception as e:
            logger.error(f"Error generating fix for {file_path}:{line_number}: {e}")
        
        return None
    
    async def _get_fix_for_issue_type(self, issue_type: str, original_line: str, file_path: str) -> Optional[Dict[str, Any]]:
        """Get specific fix suggestions based on issue type"""
        
        if issue_type == 'undefined_function':
            # Check for common typos in function names
            if re.search(r'\.lenght\b', original_line):  # Common typo: lenght instead of length
                fixed_line = original_line.replace('.lenght', '.length')
                return {
                    'description': 'Fixed typo: "lenght" should be "length"',
                    'fixed_line': fixed_line,
                    'confidence': 0.9,
                    'reasoning': 'Common typo correction'
                }
        
        elif issue_type == 'syntax_error':
            # Check for missing semicolons (JavaScript)
            if file_path.endswith(('.js', '.ts')) and not original_line.rstrip().endswith((';', '{', '}')):
                fixed_line = original_line.rstrip() + ';'
                return {
                    'description': 'Added missing semicolon',
                    'fixed_line': fixed_line,
                    'confidence': 0.7,
                    'reasoning': 'Missing semicolon in JavaScript/TypeScript'
                }
        
        elif issue_type == 'null_pointer':
            # Add null check
            if 'if' not in original_line and '.' in original_line:
                var_name = original_line.split('.')[0].strip()
                fixed_line = f"if ({var_name}) {{ {original_line.strip()} }}"
                return {
                    'description': f'Added null check for {var_name}',
                    'fixed_line': fixed_line,
                    'confidence': 0.6,
                    'reasoning': 'Added null safety check'
                }
        
        # Default suggestion
        return {
            'description': f'Review and fix {issue_type} in this line',
            'fixed_line': f'// TODO: Fix {issue_type} - {original_line}',
            'confidence': 0.3,
            'reasoning': 'Generic fix suggestion'
        }
    
    async def _create_backup(self, file_path: str) -> str:
        """Create a backup of the file before applying fixes"""
        file_path_obj = Path(file_path)
        backup_name = f"{file_path_obj.name}.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        backup_path = Path(self.backup_dir) / backup_name
        
        shutil.copy2(file_path, backup_path)
        logger.info(f"Created backup: {backup_path}")
        
        return str(backup_path)
    
    async def _apply_fix(self, file_path: str, line_number: int, fix_suggestion: Dict[str, Any]) -> bool:
        """Apply the fix to the file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            if line_number <= 0 or line_number > len(lines):
                return False
            
            # Replace the line
            lines[line_number - 1] = fix_suggestion['fixed_code'] + '\n'
            
            # Write back to file
            with open(file_path, 'w', encoding='utf-8') as f:
                f.writelines(lines)
            
            logger.info(f"Applied fix to {file_path}:{line_number}")
            return True
        
        except Exception as e:
            logger.error(f"Error applying fix to {file_path}: {e}")
            return False

# ============================================================================
# LOG TO CODE MAPPER PLUGIN
# ============================================================================

class LogToCodeMapperPlugin(MetricsCollectorPlugin):
    """Maps log entries to specific code locations"""
    
    def __init__(self, source_directories: List[str]):
        self.source_directories = source_directories
        self.code_index = {}
        self.function_map = {}
        self.error_patterns = []
    
    @property
    def name(self) -> str:
        return "log_to_code_mapper"
    
    @property
    def version(self) -> str:
        return "1.0.0"
    
    async def initialize(self, config: Optional[Dict[str, Any]] = None) -> bool:
        """Initialize the mapper"""
        if config:
            self.source_directories = config.get('source_directories', self.source_directories)
        
        # Build code index (similar to CodeAnalysisPlugin)
        await self._build_code_index()
        return True
    
    async def cleanup(self) -> None:
        """Cleanup resources"""
        self.code_index.clear()
        self.function_map.clear()
    
    async def collect_metrics(self) -> Dict[str, Any]:
        """Collect code mapping metrics"""
        return {
            'log_to_code_mapper_active': True,
            'files_indexed': len(self.code_index),
            'functions_mapped': len(self.function_map),
            'source_directories': len(self.source_directories)
        }
    
    async def _build_code_index(self):
        """Build code index (reuse logic from CodeAnalysisPlugin)"""
        # Implementation similar to CodeAnalysisPlugin._build_code_index
        for directory in self.source_directories:
            dir_path = Path(directory)
            if not dir_path.exists():
                continue
            
            code_extensions = {'.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.cpp', '.c', '.h'}
            
            for file_path in dir_path.rglob('*'):
                if file_path.is_file() and file_path.suffix in code_extensions:
                    try:
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read()
                        
                        self.code_index[str(file_path)] = {
                            'content': content,
                            'lines': content.split('\n'),
                            'extension': file_path.suffix
                        }
                    except Exception as e:
                        logger.error(f"Error indexing {file_path}: {e}")

# ============================================================================
# DEMO FUNCTION
# ============================================================================

async def demo_code_analysis():
    """Demo function for code analysis"""
    print("🎬 Code Analysis Demo")
    print("=" * 50)
    
    # Create sample code with issues
    demo_dir = Path("./demo_code")
    demo_dir.mkdir(exist_ok=True)
    
    # Create sample Python file with issues
    sample_code = '''
def calculate_total(items):
    total = 0
    for item in items:
        total += item.price  # Potential null pointer
    return total

def process_data(data):
    result = data.lenght()  # Typo: should be length()
    return result

# Missing function definition
def main():
    items = [None, {"price": 10}]
    total = calculate_total(items)
    print(f"Total: {total}")
'''
    
    sample_file = demo_dir / "sample.py"
    with open(sample_file, 'w') as f:
        f.write(sample_code)
    
    # Initialize code analysis
    code_analyzer = CodeAnalysisPlugin([str(demo_dir)])
    await code_analyzer.initialize({'confidence_threshold': 0.5})
    
    # Create sample log entries
    log_entries = [
        "2024-01-01 10:00:00 ERROR AttributeError: 'NoneType' object has no attribute 'price'",
        "2024-01-01 10:01:00 ERROR NameError: name 'lenght' is not defined"
    ]
    
    # Detect problems
    for log_message in log_entries:
        issues = await code_analyzer._analyze_error_message(log_message)
        for issue in issues:
            print(f"\n🚨 Issue Found:")
            print(f"   Type: {issue.issue_type}")
            print(f"   Severity: {issue.severity.name}")
            print(f"   Description: {issue.description}")
            print(f"   Confidence: {issue.confidence:.1%}")
            print(f"   Suggested Fix: {issue.suggested_fix}")
    
    # Test remediation
    remediation = CodeFixRemediationPlugin([str(demo_dir)], auto_apply=False)
    await remediation.initialize({'auto_apply': False})
    
    print("\n✅ Code analysis demo completed!")
    print(f"Check the demo files in: {demo_dir}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(demo_code_analysis())