/*
 * Vendored from node-gyp for Windows delay-load support.
 * This keeps the addon loadable from renamed host executables such as Electron.
 */

#ifdef _MSC_VER

#pragma managed(push, off)

#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif

#ifndef HOST_BINARY
#define HOST_BINARY "node.exe"
#endif

#include <windows.h>
#include <delayimp.h>
#include <string.h>

static FARPROC WINAPI load_exe_hook(unsigned int event, DelayLoadInfo *info) {
  HMODULE module_handle;

  if (event != dliNotePreLoadLibrary) {
    return NULL;
  }

  if (_stricmp(info->szDll, HOST_BINARY) != 0) {
    return NULL;
  }

  module_handle = GetModuleHandle(TEXT("libnode.dll"));
  if (module_handle == NULL) {
    module_handle = GetModuleHandle(NULL);
  }

  return (FARPROC)module_handle;
}

decltype(__pfnDliNotifyHook2) __pfnDliNotifyHook2 = load_exe_hook;

#pragma managed(pop)

#endif
