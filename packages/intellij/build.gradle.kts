plugins {
    id("java")
    id("org.jetbrains.kotlin.jvm") version "1.9.21"
    id("org.jetbrains.intellij") version "1.16.1"
}

group = "com.holoscript"
version = "1.0.0"

repositories {
    mavenCentral()
}

dependencies {
    implementation("com.github.nicerobot:lsp4intellij:0.5.2")
}

intellij {
    version.set("2023.3")
    type.set("IC") // IntelliJ Community Edition
    plugins.set(listOf("com.intellij.java"))
}

tasks {
    withType<JavaCompile> {
        sourceCompatibility = "17"
        targetCompatibility = "17"
    }
    withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {
        kotlinOptions.jvmTarget = "17"
    }

    patchPluginXml {
        sinceBuild.set("233")
        untilBuild.set("241.*")
        changeNotes.set("""
            <h2>1.0.0</h2>
            <ul>
                <li>Initial release</li>
                <li>Syntax highlighting for .hs, .hsplus, and .holo files</li>
                <li>LSP integration for completions, hover, go-to-definition</li>
                <li>Code formatting support</li>
            </ul>
        """.trimIndent())
    }

    signPlugin {
        certificateChain.set(System.getenv("CERTIFICATE_CHAIN"))
        privateKey.set(System.getenv("PRIVATE_KEY"))
        password.set(System.getenv("PRIVATE_KEY_PASSWORD"))
    }

    publishPlugin {
        token.set(System.getenv("PUBLISH_TOKEN"))
    }
}
