package com.holoscript.intellij.lsp

import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import java.io.File
import java.io.InputStream
import java.io.OutputStream

/**
 * HoloScript LSP Client
 * 
 * Connects to the holoscript-lsp server for language features.
 */
class HoloScriptLspClient(private val project: Project) {
    
    private var process: Process? = null
    private var inputStream: InputStream? = null
    private var outputStream: OutputStream? = null
    
    /**
     * Start the LSP server
     */
    fun start(): Boolean {
        try {
            // Try to find holoscript-lsp in common locations
            val lspPath = findLspExecutable() ?: return false
            
            val processBuilder = ProcessBuilder(lspPath, "--stdio")
            processBuilder.directory(File(project.basePath ?: System.getProperty("user.home")))
            
            process = processBuilder.start()
            inputStream = process?.inputStream
            outputStream = process?.outputStream
            
            return true
        } catch (e: Exception) {
            return false
        }
    }
    
    /**
     * Stop the LSP server
     */
    fun stop() {
        try {
            inputStream?.close()
            outputStream?.close()
            process?.destroyForcibly()
        } catch (e: Exception) {
            // Ignore cleanup errors
        }
    }
    
    /**
     * Check if the LSP server is running
     */
    fun isRunning(): Boolean = process?.isAlive == true
    
    /**
     * Find the LSP executable
     */
    private fun findLspExecutable(): String? {
        // Check common installation paths
        val paths = listOf(
            // npm global install
            System.getProperty("user.home") + "/.npm/bin/holoscript-lsp",
            "/usr/local/bin/holoscript-lsp",
            "/usr/bin/holoscript-lsp",
            // Windows
            System.getenv("APPDATA") + "/npm/holoscript-lsp.cmd",
            // Project local
            project.basePath + "/node_modules/.bin/holoscript-lsp"
        )
        
        for (path in paths) {
            val file = File(path)
            if (file.exists() && file.canExecute()) {
                return path
            }
        }
        
        // Try npx as fallback
        return "npx holoscript-lsp"
    }
    
    /**
     * Send a message to the LSP server
     */
    fun send(message: String) {
        outputStream?.let { out ->
            val content = message.toByteArray(Charsets.UTF_8)
            val header = "Content-Length: ${content.size}\r\n\r\n"
            out.write(header.toByteArray(Charsets.UTF_8))
            out.write(content)
            out.flush()
        }
    }
    
    /**
     * Initialize the LSP connection
     */
    fun initialize() {
        val initMessage = """
            {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "initialize",
                "params": {
                    "processId": ${ProcessHandle.current().pid()},
                    "rootUri": "${project.basePath}",
                    "capabilities": {
                        "textDocument": {
                            "completion": {
                                "completionItem": {
                                    "snippetSupport": true
                                }
                            },
                            "hover": {},
                            "definition": {},
                            "references": {},
                            "documentSymbol": {},
                            "formatting": {}
                        }
                    }
                }
            }
        """.trimIndent()
        
        send(initMessage)
    }
}
