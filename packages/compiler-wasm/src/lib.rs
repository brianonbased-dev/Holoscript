//! HoloScript WASM Compiler
//!
//! High-performance HoloScript parser and type checker compiled to WebAssembly.
//! Provides 10x faster parsing compared to the JavaScript implementation.

mod ast;
mod lexer;
mod parser;
mod token;
mod types;

use wasm_bindgen::prelude::*;

// Initialize panic hook for better error messages in browser console
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// Parse HoloScript source code and return AST as JSON.
///
/// # Arguments
/// * `source` - The HoloScript source code to parse
///
/// # Returns
/// A JSON string containing the AST or an error object
#[wasm_bindgen]
pub fn parse(source: &str) -> String {
    match parser::Parser::new(source).parse() {
        Ok(ast) => serde_json::to_string(&ast).unwrap_or_else(|e| {
            format!(r#"{{"error": "Serialization error: {}"}}"#, e)
        }),
        Err(errors) => {
            let error_json: Vec<_> = errors
                .iter()
                .map(|e| {
                    serde_json::json!({
                        "message": e.message,
                        "line": e.line,
                        "column": e.column,
                    })
                })
                .collect();
            serde_json::to_string(&serde_json::json!({
                "errors": error_json
            }))
            .unwrap_or_else(|_| r#"{"error": "Unknown error"}"#.to_string())
        }
    }
}

/// Parse HoloScript and return a pretty-printed JSON AST.
#[wasm_bindgen]
pub fn parse_pretty(source: &str) -> String {
    match parser::Parser::new(source).parse() {
        Ok(ast) => serde_json::to_string_pretty(&ast).unwrap_or_else(|e| {
            format!(r#"{{"error": "Serialization error: {}"}}"#, e)
        }),
        Err(errors) => {
            let error_json: Vec<_> = errors
                .iter()
                .map(|e| {
                    serde_json::json!({
                        "message": e.message,
                        "line": e.line,
                        "column": e.column,
                    })
                })
                .collect();
            serde_json::to_string_pretty(&serde_json::json!({
                "errors": error_json
            }))
            .unwrap_or_else(|_| r#"{"error": "Unknown error"}"#.to_string())
        }
    }
}

/// Validate HoloScript source code without returning the full AST.
///
/// # Returns
/// `true` if the source is valid, `false` otherwise
#[wasm_bindgen]
pub fn validate(source: &str) -> bool {
    parser::Parser::new(source).parse().is_ok()
}

/// Get detailed validation results as JSON.
#[wasm_bindgen]
pub fn validate_detailed(source: &str) -> String {
    match parser::Parser::new(source).parse() {
        Ok(_) => r#"{"valid": true, "errors": []}"#.to_string(),
        Err(errors) => {
            let error_json: Vec<_> = errors
                .iter()
                .map(|e| {
                    serde_json::json!({
                        "message": e.message,
                        "line": e.line,
                        "column": e.column,
                    })
                })
                .collect();
            serde_json::to_string(&serde_json::json!({
                "valid": false,
                "errors": error_json
            }))
            .unwrap_or_else(|_| r#"{"valid": false, "errors": []}"#.to_string())
        }
    }
}

/// Get the version of the WASM compiler.
#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_simple_orb() {
        let source = r#"orb test { color: "red" }"#;
        let result = parse(source);
        assert!(!result.contains("error"));
    }

    #[test]
    fn test_validate_valid_source() {
        let source = r#"orb cube { @grabbable position: [0, 1, 0] }"#;
        assert!(validate(source));
    }

    #[test]
    fn test_validate_invalid_source() {
        let source = r#"orb { missing name }"#;
        assert!(!validate(source));
    }
}
