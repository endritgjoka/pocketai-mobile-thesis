#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>
#import <mach/mach.h>
#import <os/proc.h>

/**
 * Matja e shfrytëzimit të memories për vlerësimin eksperimental (P2).
 *
 * Metrika kryesore e raportuar si `usedBytes` është resident_size (RSS), sepse ajo
 * përfshin edhe faqet e mapuara nga skedari GGUF. Kjo është e domosdoshme këtu:
 * llama.cpp e hap modelin me mmap, dhe matjet treguan se phys_footprint i lë jashtë
 * këto faqe (798 MB kundrejt rreth 3 GB reale për një model 2.2 GB). Vetëm RSS-ja
 * shkallëzohet me nivelin e kuantizimit, prandaj vetëm ajo i shërben krahasimit të
 * niveleve të kuantizimit. Kjo përputhet edhe me PSS-në e Android-it, e cila po ashtu
 * i numëron faqet e mapuara nga skedari.
 *
 * phys_footprint raportohet veçmas, sepse është vlera që përdor sistemi iOS (jetsam)
 * për të vendosur nëse aplikacioni duhet mbyllur, pra tregon rrezikun e mbylljes.
 */
@interface PocketAIMemoryModule : NSObject <RCTBridgeModule>
@end

@implementation PocketAIMemoryModule

RCT_EXPORT_MODULE(PocketAIMemory)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

RCT_EXPORT_METHOD(sample:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  NSMutableDictionary *out = [NSMutableDictionary dictionary];

  // phys_footprint: gjurma reale e memories sipas iOS.
  task_vm_info_data_t vmInfo;
  mach_msg_type_number_t vmCount = TASK_VM_INFO_COUNT;
  kern_return_t vmResult = task_info(mach_task_self(), TASK_VM_INFO, (task_info_t)&vmInfo, &vmCount);

  if (vmResult != KERN_SUCCESS) {
    reject(@"E_MEMORY",
           [NSString stringWithFormat:@"task_info(TASK_VM_INFO) dështoi: %s", mach_error_string(vmResult)],
           nil);
    return;
  }

  out[@"physFootprintBytes"] = @((double)vmInfo.phys_footprint);

  // RSS: përfshin faqet e mapuara nga skedari, prandaj është metrika kryesore këtu.
  mach_task_basic_info_data_t basicInfo;
  mach_msg_type_number_t basicCount = MACH_TASK_BASIC_INFO_COUNT;
  if (task_info(mach_task_self(), MACH_TASK_BASIC_INFO, (task_info_t)&basicInfo, &basicCount) == KERN_SUCCESS) {
    out[@"residentBytes"] = @((double)basicInfo.resident_size);
    out[@"residentPeakBytes"] = @((double)basicInfo.resident_size_max);
    out[@"usedBytes"] = @((double)basicInfo.resident_size);
  } else {
    // Rezervë nëse RSS nuk lexohet dot.
    out[@"usedBytes"] = @((double)vmInfo.phys_footprint);
  }

  // RAM i përgjithshëm i pajisjes.
  out[@"deviceTotalBytes"] = @((double)[[NSProcessInfo processInfo] physicalMemory]);

  // Sa memorie mund të alokojë ende ky aplikacion para se ta mbyllë sistemi.
  if (@available(iOS 13.0, *)) {
    out[@"deviceAvailableBytes"] = @((double)os_proc_available_memory());
  }

  out[@"platform"] = @"ios";
  resolve(out);
}

@end
