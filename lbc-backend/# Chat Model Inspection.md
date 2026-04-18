# Chat Model Inspection

## Latest Response

```json
[
  {
    "kind": "mcpServersStarting",
    "didStartServerIds": []
  },
  {
    "kind": "progressMessage",
    "content": {
      "value": "Getting chat ready",
      "isTrusted": false,
      "supportThemeIcons": false,
      "supportHtml": false,
      "supportAlertSyntax": false
    },
    "shimmer": true
  },
  {
    "kind": "progressMessage",
    "content": {
      "value": "Chat is almost ready",
      "isTrusted": false,
      "supportThemeIcons": false,
      "supportHtml": false,
      "supportAlertSyntax": false
    },
    "shimmer": true
  },
  {
    "kind": "warning",
    "content": {
      "value": "Chat took too long to get ready. Please ensure you are signed in to GitHub and that the extension `GitHub.copilot-chat` is installed and enabled. Click restart to try again if this issue persists.",
      "isTrusted": false,
      "supportThemeIcons": false,
      "supportHtml": false,
      "supportAlertSyntax": false
    }
  },
  {
    "kind": "command",
    "command": {
      "id": "workbench.action.chat.showOutput",
      "title": "Show Details"
    }
  }
]
```

## Full Chat Model

```json
{
  "version": 3,
  "responderUsername": "GitHub Copilot",
  "initialLocation": "panel",
  "requests": [
    {
      "requestId": "request_c570c550-5fcd-4460-9f48-524315c845cf",
      "message": {
        "text": "i am a boy",
        "parts": [
          {
            "range": {
              "start": 0,
              "endExclusive": 10
            },
            "editorRange": {
              "startLineNumber": 1,
              "startColumn": 1,
              "endLineNumber": 1,
              "endColumn": 11
            },
            "text": "i am a boy",
            "kind": "text"
          }
        ]
      },
      "variableData": {
        "variables": []
      },
      "response": [
        {
          "kind": "mcpServersStarting",
          "didStartServerIds": []
        },
        {
          "kind": "progressMessage",
          "content": {
            "value": "Getting chat ready",
            "isTrusted": false,
            "supportThemeIcons": false,
            "supportHtml": false,
            "supportAlertSyntax": false
          },
          "shimmer": true
        },
        {
          "kind": "progressMessage",
          "content": {
            "value": "Chat is almost ready",
            "isTrusted": false,
            "supportThemeIcons": false,
            "supportHtml": false,
            "supportAlertSyntax": false
          },
          "shimmer": true
        },
        {
          "kind": "warning",
          "content": {
            "value": "Chat took too long to get ready. Please ensure you are signed in to GitHub and that the extension `GitHub.copilot-chat` is installed and enabled. Click restart to try again if this issue persists.",
            "isTrusted": false,
            "supportThemeIcons": false,
            "supportHtml": false,
            "supportAlertSyntax": false
          }
        },
        {
          "kind": "command",
          "command": {
            "id": "workbench.action.chat.showOutput",
            "title": "Show Details"
          }
        }
      ],
      "agent": {
        "id": "setup.agent",
        "name": "GitHub Copilot",
        "isDefault": true,
        "isCore": true,
        "modes": [
          "agent"
        ],
        "when": "config.chat.agent.enabled && !previewFeaturesDisabled",
        "slashCommands": [],
        "disambiguation": [],
        "locations": [
          "panel"
        ],
        "metadata": {
          "helpTextPrefix": {
            "value": "You need to set up GitHub Copilot and be signed in to use Chat.",
            "isTrusted": false,
            "supportThemeIcons": false,
            "supportHtml": false,
            "supportAlertSyntax": false
          },
          "themeIcon": {
            "id": "tools"
          }
        },
        "description": "Describe what to build",
        "extensionId": {
          "value": "nullExtensionDescription",
          "_lower": "nullextensiondescription"
        },
        "extensionDisplayName": "Null Extension Description",
        "extensionPublisherId": "vscode"
      },
      "timestamp": 1776265427580,
      "modelId": "copilot/oswe-vscode-prime",
      "modeInfo": {
        "kind": "agent",
        "isBuiltin": true,
        "modeId": "agent",
        "modeName": "agent",
        "permissionLevel": "default"
      },
      "responseId": "response_504d07ea-05ba-49b5-8063-10e8a442c2f2",
      "modelState": {
        "value": 2,
        "completedAt": 1776265677045
      },
      "contentReferences": [],
      "codeCitations": [],
      "timeSpentWaiting": 0
    }
  ],
  "sessionId": "02a7fb36-7e79-41ab-9bc9-137c2d2cbb86",
  "creationDate": 1776192117531,
  "inputState": {
    "contrib": {
      "chatDynamicVariableModel": []
    },
    "attachments": [],
    "mode": {
      "id": "agent",
      "kind": "agent"
    },
    "selectedModel": {
      "identifier": "copilot/oswe-vscode-prime",
      "metadata": {
        "extension": {
          "value": "GitHub.copilot-chat",
          "_lower": "github.copilot-chat"
        },
        "id": "oswe-vscode-prime",
        "vendor": "copilot",
        "name": "Raptor mini (Preview)",
        "family": "oswe-vscode",
        "tooltip": "Rate is counted at 0x.",
        "version": "raptor-mini",
        "multiplier": "0x",
        "multiplierNumeric": 0,
        "maxInputTokens": 199805,
        "maxOutputTokens": 64000,
        "auth": {
          "providerLabel": "GitHub Copilot Chat",
          "accountLabel": "samaell44"
        },
        "isDefaultForLocation": {
          "panel": false,
          "terminal": false,
          "notebook": false,
          "editor": false
        },
        "isUserSelectable": true,
        "modelPickerCategory": {
          "label": "Standard Models",
          "order": 0
        },
        "capabilities": {
          "vision": true,
          "toolCalling": true,
          "agentMode": true
        }
      }
    },
    "inputText": "",
    "selections": [
      {
        "startLineNumber": 1,
        "startColumn": 1,
        "endLineNumber": 1,
        "endColumn": 1,
        "selectionStartLineNumber": 1,
        "selectionStartColumn": 1,
        "positionLineNumber": 1,
        "positionColumn": 1
      }
    ],
    "permissionLevel": "default"
  }
}
```
