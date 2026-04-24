#include <node_api.h>

#include <stdbool.h>
#include <stdio.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

#include "axidev-io/c_api.h"

typedef struct axidev_io_addon_state {
  napi_threadsafe_function listener_tsfn;
} axidev_io_addon_state;

typedef struct axidev_io_listener_event {
  uint32_t codepoint;
  int32_t key;
  uint32_t mods;
  bool pressed;
} axidev_io_listener_event;

static bool axidev_io_napi_ok(napi_env env, napi_status status) {
  if (status == napi_ok) {
    return true;
  }

  const napi_extended_error_info *info = NULL;
  const char *message = "N-API call failed";

  if (napi_get_last_error_info(env, &info) == napi_ok && info != NULL &&
      info->error_message != NULL) {
    message = info->error_message;
  }

  napi_throw_error(env, NULL, message);
  return false;
}

static napi_value axidev_io_return_boolean(napi_env env, bool value) {
  napi_value result;

  if (!axidev_io_napi_ok(env, napi_get_boolean(env, value, &result))) {
    return NULL;
  }

  return result;
}

static napi_value axidev_io_return_uint32(napi_env env, uint32_t value) {
  napi_value result;

  if (!axidev_io_napi_ok(env, napi_create_uint32(env, value, &result))) {
    return NULL;
  }

  return result;
}

static napi_value axidev_io_return_string_or_null(napi_env env,
                                                  const char *value) {
  napi_value result;

  if (value == NULL) {
    if (!axidev_io_napi_ok(env, napi_get_null(env, &result))) {
      return NULL;
    }
    return result;
  }

  if (!axidev_io_napi_ok(
          env, napi_create_string_utf8(env, value, NAPI_AUTO_LENGTH, &result))) {
    return NULL;
  }

  return result;
}

static napi_value axidev_io_return_undefined(napi_env env) {
  napi_value result;

  if (!axidev_io_napi_ok(env, napi_get_undefined(env, &result))) {
    return NULL;
  }

  return result;
}

static axidev_io_addon_state *axidev_io_get_state(napi_env env) {
  axidev_io_addon_state *state = NULL;

  if (!axidev_io_napi_ok(env, napi_get_instance_data(env, (void **)&state))) {
    return NULL;
  }

  return state;
}

static bool axidev_io_require_arg_count(napi_env env, size_t actual,
                                        size_t expected,
                                        const char *function_name) {
  if (actual >= expected) {
    return true;
  }

  char message[128];
  (void)snprintf(message, sizeof(message),
                 "%s expected at least %zu argument(s)", function_name,
                 expected);
  napi_throw_type_error(env, NULL, message);
  return false;
}

static bool axidev_io_get_string_arg(napi_env env, napi_value value,
                                     char **out_value) {
  napi_valuetype value_type;
  size_t length;
  char *buffer;

  *out_value = NULL;

  if (!axidev_io_napi_ok(env, napi_typeof(env, value, &value_type))) {
    return false;
  }
  if (value_type != napi_string) {
    napi_throw_type_error(env, NULL, "Expected a string");
    return false;
  }

  if (!axidev_io_napi_ok(
          env, napi_get_value_string_utf8(env, value, NULL, 0, &length))) {
    return false;
  }

  buffer = (char *)malloc(length + 1);
  if (buffer == NULL) {
    napi_throw_error(env, NULL, "Out of memory");
    return false;
  }

  if (!axidev_io_napi_ok(env, napi_get_value_string_utf8(env, value, buffer,
                                                         length + 1, &length))) {
    free(buffer);
    return false;
  }

  *out_value = buffer;
  return true;
}

static bool axidev_io_get_int32_arg(napi_env env, napi_value value,
                                    int32_t *out_value) {
  napi_valuetype value_type;

  if (!axidev_io_napi_ok(env, napi_typeof(env, value, &value_type))) {
    return false;
  }
  if (value_type != napi_number) {
    napi_throw_type_error(env, NULL, "Expected a number");
    return false;
  }

  return axidev_io_napi_ok(env, napi_get_value_int32(env, value, out_value));
}

static bool axidev_io_get_uint32_arg(napi_env env, napi_value value,
                                     uint32_t *out_value) {
  napi_valuetype value_type;

  if (!axidev_io_napi_ok(env, napi_typeof(env, value, &value_type))) {
    return false;
  }
  if (value_type != napi_number) {
    napi_throw_type_error(env, NULL, "Expected a number");
    return false;
  }

  return axidev_io_napi_ok(env, napi_get_value_uint32(env, value, out_value));
}

static bool axidev_io_get_function_arg(napi_env env, napi_value value) {
  napi_valuetype value_type;

  if (!axidev_io_napi_ok(env, napi_typeof(env, value, &value_type))) {
    return false;
  }
  if (value_type != napi_function) {
    napi_throw_type_error(env, NULL, "Expected a function");
    return false;
  }

  return true;
}

static void axidev_io_tsfn_finalize(napi_env env, void *finalize_data,
                                    void *finalize_hint) {
  axidev_io_addon_state *state = (axidev_io_addon_state *)finalize_data;
  (void)env;
  (void)finalize_hint;

  if (state != NULL) {
    state->listener_tsfn = NULL;
  }
}

static void axidev_io_call_js_listener(napi_env env, napi_value js_callback,
                                       void *context, void *data) {
  axidev_io_listener_event *event = (axidev_io_listener_event *)data;
  napi_value callback_args[1];
  napi_value event_object;
  napi_value value;
  napi_value undefined;

  (void)context;

  if (event == NULL) {
    return;
  }
  if (env == NULL) {
    free(event);
    return;
  }

  if (!axidev_io_napi_ok(env, napi_create_object(env, &event_object))) {
    free(event);
    return;
  }

  if (!axidev_io_napi_ok(env,
                         napi_create_uint32(env, event->codepoint, &value)) ||
      !axidev_io_napi_ok(env,
                         napi_set_named_property(env, event_object, "codepoint",
                                                 value)) ||
      !axidev_io_napi_ok(env, napi_create_int32(env, event->key, &value)) ||
      !axidev_io_napi_ok(
          env, napi_set_named_property(env, event_object, "key", value)) ||
      !axidev_io_napi_ok(env, napi_create_uint32(env, event->mods, &value)) ||
      !axidev_io_napi_ok(
          env, napi_set_named_property(env, event_object, "mods", value)) ||
      !axidev_io_napi_ok(env, napi_get_boolean(env, event->pressed, &value)) ||
      !axidev_io_napi_ok(
          env, napi_set_named_property(env, event_object, "pressed", value)) ||
      !axidev_io_napi_ok(env, napi_get_undefined(env, &undefined))) {
    free(event);
    return;
  }

  callback_args[0] = event_object;
  (void)napi_call_function(env, undefined, js_callback, 1, callback_args, NULL);

  free(event);
}

static void axidev_io_listener_bridge(
    uint32_t codepoint, axidev_io_keyboard_key_with_modifier_t key_mod,
    bool pressed, void *user_data) {
  axidev_io_addon_state *state = (axidev_io_addon_state *)user_data;
  axidev_io_listener_event *event;

  if (state == NULL || state->listener_tsfn == NULL) {
    return;
  }

  event = (axidev_io_listener_event *)malloc(sizeof(*event));
  if (event == NULL) {
    return;
  }

  event->codepoint = codepoint;
  event->key = (int32_t)key_mod.key;
  event->mods = (uint32_t)key_mod.mods;
  event->pressed = pressed;

  if (napi_call_threadsafe_function(state->listener_tsfn, event,
                                    napi_tsfn_nonblocking) != napi_ok) {
    free(event);
  }
}

static void axidev_io_release_listener(axidev_io_addon_state *state) {
  if (state == NULL || state->listener_tsfn == NULL) {
    return;
  }

  (void)napi_release_threadsafe_function(state->listener_tsfn, napi_tsfn_abort);
  state->listener_tsfn = NULL;
}

static void axidev_io_finalize_state(napi_env env, void *finalize_data,
                                     void *finalize_hint) {
  axidev_io_addon_state *state = (axidev_io_addon_state *)finalize_data;
  (void)env;
  (void)finalize_hint;

  axidev_io_listener_stop();
  axidev_io_keyboard_free();
  axidev_io_release_listener(state);
  free(state);
}

static napi_value js_initialize(napi_env env, napi_callback_info info) {
  (void)info;
  return axidev_io_return_boolean(env, axidev_io_keyboard_initialize());
}

static napi_value js_free(napi_env env, napi_callback_info info) {
  (void)info;
  axidev_io_keyboard_free();
  return axidev_io_return_undefined(env);
}

static napi_value js_is_ready(napi_env env, napi_callback_info info) {
  (void)info;
  return axidev_io_return_boolean(env, axidev_io_keyboard_is_ready());
}

static napi_value js_get_backend(napi_env env, napi_callback_info info) {
  (void)info;
  return axidev_io_return_uint32(env, (uint32_t)axidev_io_keyboard_type());
}

static napi_value js_get_capabilities(napi_env env, napi_callback_info info) {
  axidev_io_keyboard_capabilities_t capabilities;
  napi_value result;
  napi_value value;

  (void)info;

  memset(&capabilities, 0, sizeof(capabilities));
  axidev_io_keyboard_get_capabilities(&capabilities);

  if (!axidev_io_napi_ok(env, napi_create_object(env, &result))) {
    return NULL;
  }

  if (!axidev_io_napi_ok(
          env, napi_get_boolean(env, capabilities.can_inject_keys, &value)) ||
      !axidev_io_napi_ok(env, napi_set_named_property(env, result,
                                                      "canInjectKeys", value)) ||
      !axidev_io_napi_ok(
          env, napi_get_boolean(env, capabilities.can_inject_text, &value)) ||
      !axidev_io_napi_ok(env, napi_set_named_property(env, result,
                                                      "canInjectText", value)) ||
      !axidev_io_napi_ok(
          env, napi_get_boolean(env, capabilities.can_simulate_hid, &value)) ||
      !axidev_io_napi_ok(env, napi_set_named_property(env, result,
                                                      "canSimulateHid", value)) ||
      !axidev_io_napi_ok(
          env, napi_get_boolean(env, capabilities.supports_key_repeat, &value)) ||
      !axidev_io_napi_ok(env, napi_set_named_property(env, result,
                                                      "supportsKeyRepeat",
                                                      value)) ||
      !axidev_io_napi_ok(env, napi_get_boolean(
                                  env, capabilities.needs_accessibility_perm,
                                  &value)) ||
      !axidev_io_napi_ok(env, napi_set_named_property(env, result,
                                                      "needsAccessibilityPerm",
                                                      value)) ||
      !axidev_io_napi_ok(env, napi_get_boolean(
                                  env,
                                  capabilities.needs_input_monitoring_perm,
                                  &value)) ||
      !axidev_io_napi_ok(env, napi_set_named_property(env, result,
                                                      "needsInputMonitoringPerm",
                                                      value)) ||
      !axidev_io_napi_ok(
          env, napi_get_boolean(env, capabilities.needs_uinput_access, &value)) ||
      !axidev_io_napi_ok(env, napi_set_named_property(env, result,
                                                      "needsUinputAccess",
                                                      value))) {
    return NULL;
  }

  return result;
}

static napi_value js_request_permissions(napi_env env, napi_callback_info info) {
  (void)info;
  return axidev_io_return_boolean(env, axidev_io_keyboard_request_permissions());
}

static napi_value js_key_down(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value args[2];
  int32_t key;
  uint32_t mods;
  axidev_io_keyboard_key_with_modifier_t key_mod;

  if (!axidev_io_napi_ok(env, napi_get_cb_info(env, info, &argc, args, NULL,
                                               NULL)) ||
      !axidev_io_require_arg_count(env, argc, 2, "keyDown") ||
      !axidev_io_get_int32_arg(env, args[0], &key) ||
      !axidev_io_get_uint32_arg(env, args[1], &mods)) {
    return NULL;
  }

  key_mod.key = (axidev_io_keyboard_key_t)key;
  key_mod.mods = (axidev_io_keyboard_modifier_t)mods;
  return axidev_io_return_boolean(env,
                                  axidev_io_keyboard_key_down(key_mod, false));
}

static napi_value js_key_up(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value args[2];
  int32_t key;
  uint32_t mods;
  axidev_io_keyboard_key_with_modifier_t key_mod;

  if (!axidev_io_napi_ok(env, napi_get_cb_info(env, info, &argc, args, NULL,
                                               NULL)) ||
      !axidev_io_require_arg_count(env, argc, 2, "keyUp") ||
      !axidev_io_get_int32_arg(env, args[0], &key) ||
      !axidev_io_get_uint32_arg(env, args[1], &mods)) {
    return NULL;
  }

  key_mod.key = (axidev_io_keyboard_key_t)key;
  key_mod.mods = (axidev_io_keyboard_modifier_t)mods;
  return axidev_io_return_boolean(env, axidev_io_keyboard_key_up(key_mod));
}

static napi_value js_tap(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value args[2];
  int32_t key;
  uint32_t mods;
  axidev_io_keyboard_key_with_modifier_t key_mod;

  if (!axidev_io_napi_ok(env, napi_get_cb_info(env, info, &argc, args, NULL,
                                               NULL)) ||
      !axidev_io_require_arg_count(env, argc, 2, "tap") ||
      !axidev_io_get_int32_arg(env, args[0], &key) ||
      !axidev_io_get_uint32_arg(env, args[1], &mods)) {
    return NULL;
  }

  key_mod.key = (axidev_io_keyboard_key_t)key;
  key_mod.mods = (axidev_io_keyboard_modifier_t)mods;
  return axidev_io_return_boolean(env, axidev_io_keyboard_tap(key_mod));
}

static napi_value js_active_modifiers(napi_env env, napi_callback_info info) {
  (void)info;
  return axidev_io_return_uint32(env,
                                 (uint32_t)axidev_io_keyboard_active_modifiers());
}

static napi_value js_hold_modifiers(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  uint32_t mods;

  if (!axidev_io_napi_ok(env, napi_get_cb_info(env, info, &argc, args, NULL,
                                               NULL)) ||
      !axidev_io_require_arg_count(env, argc, 1, "holdModifiers") ||
      !axidev_io_get_uint32_arg(env, args[0], &mods)) {
    return NULL;
  }

  return axidev_io_return_boolean(
      env,
      axidev_io_keyboard_hold_modifier((axidev_io_keyboard_modifier_t)mods));
}

static napi_value js_release_modifiers(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  uint32_t mods;

  if (!axidev_io_napi_ok(env, napi_get_cb_info(env, info, &argc, args, NULL,
                                               NULL)) ||
      !axidev_io_require_arg_count(env, argc, 1, "releaseModifiers") ||
      !axidev_io_get_uint32_arg(env, args[0], &mods)) {
    return NULL;
  }

  return axidev_io_return_boolean(
      env,
      axidev_io_keyboard_release_modifier((axidev_io_keyboard_modifier_t)mods));
}

static napi_value js_release_all_modifiers(napi_env env,
                                           napi_callback_info info) {
  (void)info;
  return axidev_io_return_boolean(env,
                                  axidev_io_keyboard_release_all_modifiers());
}

static napi_value js_type_text(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  char *text;
  bool ok;

  text = NULL;

  if (!axidev_io_napi_ok(env, napi_get_cb_info(env, info, &argc, args, NULL,
                                               NULL)) ||
      !axidev_io_require_arg_count(env, argc, 1, "typeText") ||
      !axidev_io_get_string_arg(env, args[0], &text)) {
    return NULL;
  }

  ok = axidev_io_keyboard_type_text(text);
  free(text);

  return axidev_io_return_boolean(env, ok);
}

static napi_value js_type_character(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  uint32_t codepoint;

  if (!axidev_io_napi_ok(env, napi_get_cb_info(env, info, &argc, args, NULL,
                                               NULL)) ||
      !axidev_io_require_arg_count(env, argc, 1, "typeCharacter") ||
      !axidev_io_get_uint32_arg(env, args[0], &codepoint)) {
    return NULL;
  }

  return axidev_io_return_boolean(
      env, axidev_io_keyboard_type_character(codepoint));
}

static napi_value js_flush(napi_env env, napi_callback_info info) {
  (void)info;
  axidev_io_keyboard_flush();
  return axidev_io_return_undefined(env);
}

static napi_value js_set_key_delay(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  uint32_t delay_us;

  if (!axidev_io_napi_ok(env, napi_get_cb_info(env, info, &argc, args, NULL,
                                               NULL)) ||
      !axidev_io_require_arg_count(env, argc, 1, "setKeyDelay") ||
      !axidev_io_get_uint32_arg(env, args[0], &delay_us)) {
    return NULL;
  }

  axidev_io_keyboard_set_key_delay(delay_us);
  return axidev_io_return_undefined(env);
}

static napi_value js_start_listener(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  napi_value resource_name;
  axidev_io_addon_state *state;

  if (!axidev_io_napi_ok(env, napi_get_cb_info(env, info, &argc, args, NULL,
                                               NULL)) ||
      !axidev_io_require_arg_count(env, argc, 1, "startListener") ||
      !axidev_io_get_function_arg(env, args[0])) {
    return NULL;
  }

  state = axidev_io_get_state(env);
  if (state == NULL) {
    return NULL;
  }

  if (state->listener_tsfn != NULL) {
    return axidev_io_return_boolean(env, false);
  }

  if (!axidev_io_napi_ok(env, napi_create_string_utf8(env,
                                                      "axidev_io_listener",
                                                      NAPI_AUTO_LENGTH,
                                                      &resource_name))) {
    return NULL;
  }

  if (!axidev_io_napi_ok(
          env, napi_create_threadsafe_function(
                   env, args[0], NULL, resource_name, 0, 1, state,
                   axidev_io_tsfn_finalize, NULL, axidev_io_call_js_listener,
                   &state->listener_tsfn))) {
    return NULL;
  }

  if (!axidev_io_listener_start(axidev_io_listener_bridge, state)) {
    axidev_io_release_listener(state);
    return axidev_io_return_boolean(env, false);
  }

  return axidev_io_return_boolean(env, true);
}

static napi_value js_stop_listener(napi_env env, napi_callback_info info) {
  axidev_io_addon_state *state = axidev_io_get_state(env);
  (void)info;

  if (state == NULL) {
    return NULL;
  }

  axidev_io_listener_stop();
  axidev_io_release_listener(state);
  return axidev_io_return_undefined(env);
}

static napi_value js_is_listening(napi_env env, napi_callback_info info) {
  (void)info;
  return axidev_io_return_boolean(env, axidev_io_listener_is_listening());
}

static napi_value js_key_to_string(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  int32_t key;
  char *text;
  napi_value result;

  if (!axidev_io_napi_ok(env, napi_get_cb_info(env, info, &argc, args, NULL,
                                               NULL)) ||
      !axidev_io_require_arg_count(env, argc, 1, "keyToString") ||
      !axidev_io_get_int32_arg(env, args[0], &key)) {
    return NULL;
  }

  text = axidev_io_keyboard_key_to_string((axidev_io_keyboard_key_t)key);
  result = axidev_io_return_string_or_null(env, text);
  if (text != NULL) {
    axidev_io_free_string(text);
  }

  return result;
}

static napi_value js_string_to_key(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  char *text;
  axidev_io_keyboard_key_t key;

  text = NULL;

  if (!axidev_io_napi_ok(env, napi_get_cb_info(env, info, &argc, args, NULL,
                                               NULL)) ||
      !axidev_io_require_arg_count(env, argc, 1, "stringToKey") ||
      !axidev_io_get_string_arg(env, args[0], &text)) {
    return NULL;
  }

  key = axidev_io_keyboard_string_to_key(text);
  free(text);

  return axidev_io_return_uint32(env, (uint32_t)key);
}

static napi_value js_key_to_string_with_modifier(napi_env env,
                                                 napi_callback_info info) {
  size_t argc = 2;
  napi_value args[2];
  int32_t key;
  uint32_t mods;
  axidev_io_keyboard_key_with_modifier_t key_mod;
  char *text;
  napi_value result;

  if (!axidev_io_napi_ok(env, napi_get_cb_info(env, info, &argc, args, NULL,
                                               NULL)) ||
      !axidev_io_require_arg_count(env, argc, 2, "keyToStringWithModifier") ||
      !axidev_io_get_int32_arg(env, args[0], &key) ||
      !axidev_io_get_uint32_arg(env, args[1], &mods)) {
    return NULL;
  }

  key_mod.key = (axidev_io_keyboard_key_t)key;
  key_mod.mods = (axidev_io_keyboard_modifier_t)mods;
  text = axidev_io_keyboard_key_to_string_with_modifier(key_mod);

  result = axidev_io_return_string_or_null(env, text);
  if (text != NULL) {
    axidev_io_free_string(text);
  }

  return result;
}

static napi_value js_string_to_key_with_modifier(napi_env env,
                                                 napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  char *text;
  axidev_io_keyboard_key_with_modifier_t key_mod;
  napi_value result;
  napi_value value;
  bool ok;

  text = NULL;
  memset(&key_mod, 0, sizeof(key_mod));

  if (!axidev_io_napi_ok(env, napi_get_cb_info(env, info, &argc, args, NULL,
                                               NULL)) ||
      !axidev_io_require_arg_count(env, argc, 1, "stringToKeyWithModifier") ||
      !axidev_io_get_string_arg(env, args[0], &text)) {
    return NULL;
  }

  ok = axidev_io_keyboard_string_to_key_with_modifier(text, &key_mod);
  free(text);

  if (!ok) {
    return axidev_io_return_string_or_null(env, NULL);
  }

  if (!axidev_io_napi_ok(env, napi_create_object(env, &result)) ||
      !axidev_io_napi_ok(env,
                         napi_create_int32(env, (int32_t)key_mod.key, &value)) ||
      !axidev_io_napi_ok(
          env, napi_set_named_property(env, result, "key", value)) ||
      !axidev_io_napi_ok(
          env, napi_create_uint32(env, (uint32_t)key_mod.mods, &value)) ||
      !axidev_io_napi_ok(
          env, napi_set_named_property(env, result, "mods", value))) {
    return NULL;
  }

  return result;
}

static napi_value js_version(napi_env env, napi_callback_info info) {
  (void)info;
  return axidev_io_return_string_or_null(env, axidev_io_library_version());
}

static napi_value js_get_last_error(napi_env env, napi_callback_info info) {
  char *text;
  napi_value result;

  (void)info;

  text = axidev_io_get_last_error();
  result = axidev_io_return_string_or_null(env, text);
  if (text != NULL) {
    axidev_io_free_string(text);
  }

  return result;
}

static napi_value js_clear_last_error(napi_env env, napi_callback_info info) {
  (void)info;
  axidev_io_clear_last_error();
  return axidev_io_return_undefined(env);
}

static napi_value js_log_set_level(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  uint32_t level;

  if (!axidev_io_napi_ok(env, napi_get_cb_info(env, info, &argc, args, NULL,
                                               NULL)) ||
      !axidev_io_require_arg_count(env, argc, 1, "logSetLevel") ||
      !axidev_io_get_uint32_arg(env, args[0], &level)) {
    return NULL;
  }

  axidev_io_log_set_level((axidev_io_log_level_t)level);
  return axidev_io_return_undefined(env);
}

static napi_value js_log_get_level(napi_env env, napi_callback_info info) {
  (void)info;
  return axidev_io_return_uint32(env, (uint32_t)axidev_io_log_get_level());
}

NAPI_MODULE_INIT() {
  static const napi_property_descriptor descriptors[] = {
      {"initialize", NULL, js_initialize, NULL, NULL, NULL, napi_default, NULL},
      {"free", NULL, js_free, NULL, NULL, NULL, napi_default, NULL},
      {"isReady", NULL, js_is_ready, NULL, NULL, NULL, napi_default, NULL},
      {"getBackend", NULL, js_get_backend, NULL, NULL, NULL, napi_default,
       NULL},
      {"getCapabilities", NULL, js_get_capabilities, NULL, NULL, NULL,
       napi_default, NULL},
      {"requestPermissions", NULL, js_request_permissions, NULL, NULL, NULL,
       napi_default, NULL},
      {"keyDown", NULL, js_key_down, NULL, NULL, NULL, napi_default, NULL},
      {"keyUp", NULL, js_key_up, NULL, NULL, NULL, napi_default, NULL},
      {"tap", NULL, js_tap, NULL, NULL, NULL, napi_default, NULL},
      {"activeModifiers", NULL, js_active_modifiers, NULL, NULL, NULL,
       napi_default, NULL},
      {"holdModifiers", NULL, js_hold_modifiers, NULL, NULL, NULL,
       napi_default, NULL},
      {"releaseModifiers", NULL, js_release_modifiers, NULL, NULL, NULL,
       napi_default, NULL},
      {"releaseAllModifiers", NULL, js_release_all_modifiers, NULL, NULL, NULL,
       napi_default, NULL},
      {"typeText", NULL, js_type_text, NULL, NULL, NULL, napi_default, NULL},
      {"typeCharacter", NULL, js_type_character, NULL, NULL, NULL,
       napi_default, NULL},
      {"flush", NULL, js_flush, NULL, NULL, NULL, napi_default, NULL},
      {"setKeyDelay", NULL, js_set_key_delay, NULL, NULL, NULL, napi_default,
       NULL},
      {"startListener", NULL, js_start_listener, NULL, NULL, NULL,
       napi_default, NULL},
      {"stopListener", NULL, js_stop_listener, NULL, NULL, NULL, napi_default,
       NULL},
      {"isListening", NULL, js_is_listening, NULL, NULL, NULL, napi_default,
       NULL},
      {"keyToString", NULL, js_key_to_string, NULL, NULL, NULL, napi_default,
       NULL},
      {"stringToKey", NULL, js_string_to_key, NULL, NULL, NULL, napi_default,
       NULL},
      {"keyToStringWithModifier", NULL, js_key_to_string_with_modifier, NULL,
       NULL, NULL, napi_default, NULL},
      {"stringToKeyWithModifier", NULL, js_string_to_key_with_modifier, NULL,
       NULL, NULL, napi_default, NULL},
      {"version", NULL, js_version, NULL, NULL, NULL, napi_default, NULL},
      {"getLastError", NULL, js_get_last_error, NULL, NULL, NULL, napi_default,
       NULL},
      {"clearLastError", NULL, js_clear_last_error, NULL, NULL, NULL,
       napi_default, NULL},
      {"logSetLevel", NULL, js_log_set_level, NULL, NULL, NULL, napi_default,
       NULL},
      {"logGetLevel", NULL, js_log_get_level, NULL, NULL, NULL, napi_default,
       NULL},
  };
  axidev_io_addon_state *state =
      (axidev_io_addon_state *)calloc(1, sizeof(*state));

  if (state == NULL) {
    napi_throw_error(env, NULL, "Out of memory");
    return NULL;
  }

  if (!axidev_io_napi_ok(
          env, napi_set_instance_data(env, state, axidev_io_finalize_state,
                                      NULL))) {
    free(state);
    return NULL;
  }

  if (!axidev_io_napi_ok(
          env, napi_define_properties(env, exports,
                                      sizeof(descriptors) / sizeof(*descriptors),
                                      descriptors))) {
    return NULL;
  }

  return exports;
}
