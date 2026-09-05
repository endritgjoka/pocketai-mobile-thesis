package com.endritgjokaj.pocketai

import android.app.ActivityManager
import android.content.Context
import android.os.Debug
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments

/**
 * Matja e shfrytëzimit të memories për vlerësimin eksperimental (P2).
 *
 * Metrika kryesore është PSS (Proportional Set Size), e cila është metrika standarde
 * e Android-it për memorien e një procesi: faqet e ndara me procese të tjera numërohen
 * në mënyrë proporcionale. Kjo është e rëndësishme sepse llama.cpp e hap skedarin GGUF
 * me mmap, prandaj një pjesë e modelit numërohet si memorie e mapuar nga skedari dhe
 * jo si heap. Për këtë arsye raportohen veçmas edhe heap-i vendas dhe ai i Java-s.
 */
class PocketAIMemoryModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "PocketAIMemory"

  private fun activityManager(): ActivityManager? =
    reactApplicationContext.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager

  @ReactMethod
  fun sample(promise: Promise) {
    try {
      val map: WritableMap = Arguments.createMap()
      val am = activityManager()

      // PSS i procesit aktual, i ndarë sipas kategorive.
      val info = Debug.MemoryInfo()
      Debug.getMemoryInfo(info)
      val totalPssBytes = info.totalPss.toDouble() * 1024.0
      map.putDouble("usedBytes", totalPssBytes)
      map.putDouble("pssTotalBytes", totalPssBytes)
      map.putDouble("pssNativeBytes", info.nativePss.toDouble() * 1024.0)
      map.putDouble("pssDalvikBytes", info.dalvikPss.toDouble() * 1024.0)
      map.putDouble("pssOtherBytes", info.otherPss.toDouble() * 1024.0)

      // Heap vendas (alokimet e llama.cpp që nuk vijnë nga mmap).
      map.putDouble("nativeHeapBytes", Debug.getNativeHeapAllocatedSize().toDouble())

      // Heap i Java-s / JVM.
      val runtime = Runtime.getRuntime()
      map.putDouble("javaHeapBytes", (runtime.totalMemory() - runtime.freeMemory()).toDouble())

      // Gjendja e pajisjes: sa RAM ka gjithsej dhe sa është e lirë.
      if (am != null) {
        val mi = ActivityManager.MemoryInfo()
        am.getMemoryInfo(mi)
        map.putDouble("deviceTotalBytes", mi.totalMem.toDouble())
        map.putDouble("deviceAvailableBytes", mi.availMem.toDouble())
        map.putBoolean("deviceLowMemory", mi.lowMemory)
        // Kufiri i heap-it për aplikacion, tregues i rrezikut për mbyllje nga sistemi.
        map.putDouble("appMemoryLimitBytes", am.largeMemoryClass.toDouble() * 1024.0 * 1024.0)
      }

      map.putString("platform", "android")
      promise.resolve(map)
    } catch (e: Exception) {
      promise.reject("E_MEMORY", "Nuk u lexua dot memoria: ${e.message}", e)
    }
  }
}
