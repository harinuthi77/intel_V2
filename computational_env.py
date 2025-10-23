# computational_env.py - COMPUTATIONAL ENVIRONMENT LIKE MANUS AI
# Provides terminal, code editor, file system access for the agent

import os
import subprocess
import tempfile
import shutil
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
import json

@dataclass
class ExecutionResult:
    """Result from executing code or commands"""
    success: bool
    output: str
    error: str
    exit_code: int
    execution_time: float
    artifacts: List[str] = None

class ComputationalEnvironment:
    """
    Provides a sandboxed computational environment for the agent
    Similar to Manus AI's computer environment
    """

    def __init__(self, workspace_dir: Optional[str] = None):
        """Initialize the computational environment"""
        if workspace_dir:
            self.workspace = Path(workspace_dir)
        else:
            self.workspace = Path(tempfile.mkdtemp(prefix="forge_workspace_"))

        self.workspace.mkdir(parents=True, exist_ok=True)
        self.command_history = []
        self.file_cache = {}

    def execute_terminal_command(self, command: str, cwd: Optional[str] = None, timeout: int = 30) -> ExecutionResult:
        """
        Execute a terminal command in the workspace

        Args:
            command: Shell command to execute
            cwd: Working directory (defaults to workspace)
            timeout: Timeout in seconds

        Returns:
            ExecutionResult with output and status
        """
        import time
        start_time = time.time()

        work_dir = Path(cwd) if cwd else self.workspace

        try:
            result = subprocess.run(
                command,
                shell=True,
                cwd=str(work_dir),
                capture_output=True,
                text=True,
                timeout=timeout
            )

            execution_time = time.time() - start_time

            self.command_history.append({
                'command': command,
                'timestamp': time.time(),
                'success': result.returncode == 0,
                'output': result.stdout,
                'error': result.stderr
            })

            return ExecutionResult(
                success=result.returncode == 0,
                output=result.stdout,
                error=result.stderr,
                exit_code=result.returncode,
                execution_time=execution_time
            )

        except subprocess.TimeoutExpired:
            return ExecutionResult(
                success=False,
                output="",
                error=f"Command timed out after {timeout} seconds",
                exit_code=-1,
                execution_time=timeout
            )
        except Exception as e:
            return ExecutionResult(
                success=False,
                output="",
                error=str(e),
                exit_code=-1,
                execution_time=time.time() - start_time
            )

    def execute_python_code(self, code: str, timeout: int = 30) -> ExecutionResult:
        """
        Execute Python code in an isolated environment

        Args:
            code: Python code to execute
            timeout: Timeout in seconds

        Returns:
            ExecutionResult with output
        """
        # Create a temporary Python file
        temp_file = self.workspace / f"temp_script_{len(self.command_history)}.py"
        temp_file.write_text(code)

        try:
            result = self.execute_terminal_command(
                f"python {temp_file.name}",
                cwd=str(self.workspace),
                timeout=timeout
            )

            # Clean up
            if temp_file.exists():
                temp_file.unlink()

            return result

        except Exception as e:
            return ExecutionResult(
                success=False,
                output="",
                error=str(e),
                exit_code=-1,
                execution_time=0
            )

    def write_file(self, filename: str, content: str, mode: str = 'w') -> ExecutionResult:
        """
        Write content to a file in the workspace

        Args:
            filename: Name of the file (relative to workspace)
            content: Content to write
            mode: Write mode ('w' or 'a')

        Returns:
            ExecutionResult
        """
        try:
            file_path = self.workspace / filename
            file_path.parent.mkdir(parents=True, exist_ok=True)

            with open(file_path, mode) as f:
                f.write(content)

            self.file_cache[filename] = content

            return ExecutionResult(
                success=True,
                output=f"File written: {filename} ({len(content)} bytes)",
                error="",
                exit_code=0,
                execution_time=0,
                artifacts=[str(file_path)]
            )

        except Exception as e:
            return ExecutionResult(
                success=False,
                output="",
                error=str(e),
                exit_code=-1,
                execution_time=0
            )

    def read_file(self, filename: str) -> Tuple[bool, str]:
        """
        Read a file from the workspace

        Args:
            filename: Name of the file

        Returns:
            Tuple of (success, content)
        """
        try:
            file_path = self.workspace / filename
            content = file_path.read_text()
            self.file_cache[filename] = content
            return True, content
        except Exception as e:
            return False, str(e)

    def list_files(self, pattern: str = "*") -> List[str]:
        """
        List files in the workspace

        Args:
            pattern: Glob pattern

        Returns:
            List of file paths
        """
        return [str(p.relative_to(self.workspace)) for p in self.workspace.rglob(pattern)]

    def install_package(self, package: str) -> ExecutionResult:
        """
        Install a Python package using pip

        Args:
            package: Package name (e.g., 'pandas', 'numpy')

        Returns:
            ExecutionResult
        """
        return self.execute_terminal_command(f"pip install {package}")

    def get_environment_info(self) -> Dict[str, Any]:
        """Get information about the computational environment"""
        return {
            'workspace': str(self.workspace),
            'files': self.list_files(),
            'command_history_count': len(self.command_history),
            'cached_files': list(self.file_cache.keys()),
            'python_version': self.execute_terminal_command("python --version").output.strip(),
            'disk_usage': {
                'total': shutil.disk_usage(self.workspace).total,
                'used': shutil.disk_usage(self.workspace).used,
                'free': shutil.disk_usage(self.workspace).free
            }
        }

    def cleanup(self):
        """Clean up the workspace"""
        if self.workspace.exists():
            shutil.rmtree(self.workspace)


class CodeEditor:
    """Simple in-memory code editor for the agent"""

    def __init__(self, comp_env: ComputationalEnvironment):
        self.comp_env = comp_env
        self.open_files = {}
        self.undo_stack = {}

    def open_file(self, filename: str) -> Tuple[bool, str]:
        """Open a file for editing"""
        success, content = self.comp_env.read_file(filename)
        if success:
            self.open_files[filename] = content
            self.undo_stack[filename] = [content]
        return success, content

    def edit_file(self, filename: str, old_text: str, new_text: str) -> Tuple[bool, str]:
        """Edit a file by replacing text"""
        if filename not in self.open_files:
            success, _ = self.open_file(filename)
            if not success:
                return False, "File not found"

        content = self.open_files[filename]
        if old_text not in content:
            return False, "Old text not found in file"

        new_content = content.replace(old_text, new_text)
        self.open_files[filename] = new_content
        self.undo_stack[filename].append(new_content)

        return True, "Edit successful"

    def save_file(self, filename: str) -> ExecutionResult:
        """Save the file to disk"""
        if filename not in self.open_files:
            return ExecutionResult(
                success=False,
                output="",
                error="File not open in editor",
                exit_code=-1,
                execution_time=0
            )

        return self.comp_env.write_file(filename, self.open_files[filename])

    def undo(self, filename: str) -> Tuple[bool, str]:
        """Undo last edit"""
        if filename not in self.undo_stack or len(self.undo_stack[filename]) < 2:
            return False, "Nothing to undo"

        self.undo_stack[filename].pop()
        self.open_files[filename] = self.undo_stack[filename][-1]
        return True, "Undo successful"


# Singleton instance
_global_env = None

def get_computational_environment() -> ComputationalEnvironment:
    """Get or create the global computational environment"""
    global _global_env
    if _global_env is None:
        _global_env = ComputationalEnvironment()
    return _global_env
