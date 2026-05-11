const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

function patchFile(relativePath, replacements) {
  const file = path.join(root, relativePath);
  if (!fs.existsSync(file)) {
    return;
  }

  const source = fs.readFileSync(file, "utf8");
  let patched = source;

  for (const [from, to] of replacements) {
    patched = patched.replace(from, to);
  }

  if (patched !== source) {
    fs.writeFileSync(file, patched);
    console.log(`Patched ${relativePath} for project paths containing spaces.`);
  }
}

patchFile("node_modules/react-native/scripts/xcode/with-environment.sh", [
  ["if [ -n \"$1\" ]; then\n  $1\nfi", "if [ -n \"$1\" ]; then\n  \"$1\"\nfi"],
]);

patchFile("ios/Pods/Pods.xcodeproj/project.pbxproj", [
  [
    "bash -l -c \"$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh\"",
    "bash \"$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh\"",
  ],
  [
    "export RCT_SCRIPT_RN_DIR=$RCT_SCRIPT_POD_INSTALLATION_ROOT/../node_modules/react-native",
    "export RCT_SCRIPT_RN_DIR=\"$RCT_SCRIPT_POD_INSTALLATION_ROOT/../node_modules/react-native\"",
  ],
  [
    "export RCT_SCRIPT_APP_PATH=$RCT_SCRIPT_POD_INSTALLATION_ROOT/..",
    "export RCT_SCRIPT_APP_PATH=\"$RCT_SCRIPT_POD_INSTALLATION_ROOT/..\"",
  ],
  [
    "export RCT_SCRIPT_OUTPUT_DIR=$RCT_SCRIPT_POD_INSTALLATION_ROOT",
    "export RCT_SCRIPT_OUTPUT_DIR=\"$RCT_SCRIPT_POD_INSTALLATION_ROOT\"",
  ],
  [
    "/bin/sh -c \"$WITH_ENVIRONMENT $SCRIPT_PHASES_SCRIPT\"",
    "\"$WITH_ENVIRONMENT\" \"$SCRIPT_PHASES_SCRIPT\"",
  ],
]);

patchFile("ios/PocketAI.xcodeproj/project.pbxproj", [
  [
    "bash -l -c \"./Pods/Target\\\\ Support\\\\ Files/Pods-PocketAI/expo-configure-project.sh\"",
    "bash \"./Pods/Target Support Files/Pods-PocketAI/expo-configure-project.sh\"",
  ],
  [
    "`\"$NODE_BINARY\" --print \"require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'\"`",
    "REACT_NATIVE_XCODE_SCRIPT=\"$(\"$NODE_BINARY\" --print \"require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'\")\"\n\"$REACT_NATIVE_XCODE_SCRIPT\"",
  ],
]);
