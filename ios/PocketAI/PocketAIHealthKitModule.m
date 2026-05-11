#import <Foundation/Foundation.h>
#import <HealthKit/HealthKit.h>
#import <React/RCTBridgeModule.h>

@interface PocketAIHealthKitModule : NSObject <RCTBridgeModule>
@property (nonatomic, strong) HKHealthStore *healthStore;
@end

@implementation PocketAIHealthKitModule

RCT_EXPORT_MODULE(PocketAIHealthKit)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (HKHealthStore *)store
{
  if (!_healthStore) {
    _healthStore = [[HKHealthStore alloc] init];
  }
  return _healthStore;
}

- (NSDate *)dateFromISOString:(NSString *)value
{
  static NSISO8601DateFormatter *formatter;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    formatter = [[NSISO8601DateFormatter alloc] init];
    formatter.formatOptions = NSISO8601DateFormatWithInternetDateTime | NSISO8601DateFormatWithFractionalSeconds;
  });
  NSDate *date = [formatter dateFromString:value];
  if (date) {
    return date;
  }

  NSISO8601DateFormatter *fallback = [[NSISO8601DateFormatter alloc] init];
  fallback.formatOptions = NSISO8601DateFormatWithInternetDateTime;
  return [fallback dateFromString:value];
}

- (NSSet<HKObjectType *> *)readTypes
{
  NSMutableSet<HKObjectType *> *types = [NSMutableSet set];
  HKObjectType *steps = [HKObjectType quantityTypeForIdentifier:HKQuantityTypeIdentifierStepCount];
  HKObjectType *sleep = [HKObjectType categoryTypeForIdentifier:HKCategoryTypeIdentifierSleepAnalysis];
  HKObjectType *heartRate = [HKObjectType quantityTypeForIdentifier:HKQuantityTypeIdentifierHeartRate];
  if (steps) [types addObject:steps];
  if (sleep) [types addObject:sleep];
  if (heartRate) [types addObject:heartRate];
  return types;
}

RCT_REMAP_METHOD(isAvailable,
                 isAvailableWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  resolve(@([HKHealthStore isHealthDataAvailable]));
}

RCT_REMAP_METHOD(requestPermissions,
                 requestPermissionsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  if (![HKHealthStore isHealthDataAvailable]) {
    reject(@"health_unavailable", @"HealthKit data is not available on this device.", nil);
    return;
  }

  dispatch_async(dispatch_get_main_queue(), ^{
    [[self store] requestAuthorizationToShareTypes:nil readTypes:[self readTypes] completion:^(BOOL success, NSError * _Nullable error) {
      if (error) {
        reject(@"health_permission_error", error.localizedDescription, error);
        return;
      }
      resolve(@(success));
    }];
  });
}

RCT_REMAP_METHOD(getStepCount,
                 getStepCountFrom:(NSString *)startDateString
                 endDate:(NSString *)endDateString
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  HKQuantityType *type = [HKObjectType quantityTypeForIdentifier:HKQuantityTypeIdentifierStepCount];
  NSDate *startDate = [self dateFromISOString:startDateString];
  NSDate *endDate = [self dateFromISOString:endDateString];
  if (!type || !startDate || !endDate) {
    reject(@"health_bad_arguments", @"Invalid HealthKit step query arguments.", nil);
    return;
  }

  NSPredicate *predicate = [HKQuery predicateForSamplesWithStartDate:startDate endDate:endDate options:HKQueryOptionStrictStartDate];
  HKStatisticsQuery *query = [[HKStatisticsQuery alloc] initWithQuantityType:type quantitySamplePredicate:predicate options:HKStatisticsOptionCumulativeSum completionHandler:^(HKStatisticsQuery * _Nonnull query, HKStatistics * _Nullable result, NSError * _Nullable error) {
    if (error) {
      reject(@"health_steps_error", error.localizedDescription, error);
      return;
    }
    double value = [[result sumQuantity] doubleValueForUnit:[HKUnit countUnit]];
    resolve(@(value));
  }];
  [[self store] executeQuery:query];
}

RCT_REMAP_METHOD(getSleepHours,
                 getSleepHoursFrom:(NSString *)startDateString
                 endDate:(NSString *)endDateString
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  HKCategoryType *type = [HKObjectType categoryTypeForIdentifier:HKCategoryTypeIdentifierSleepAnalysis];
  NSDate *startDate = [self dateFromISOString:startDateString];
  NSDate *endDate = [self dateFromISOString:endDateString];
  if (!type || !startDate || !endDate) {
    reject(@"health_bad_arguments", @"Invalid HealthKit sleep query arguments.", nil);
    return;
  }

  NSPredicate *predicate = [HKQuery predicateForSamplesWithStartDate:startDate endDate:endDate options:HKQueryOptionStrictStartDate];
  NSSortDescriptor *sort = [NSSortDescriptor sortDescriptorWithKey:HKSampleSortIdentifierStartDate ascending:YES];
  HKSampleQuery *query = [[HKSampleQuery alloc] initWithSampleType:type predicate:predicate limit:HKObjectQueryNoLimit sortDescriptors:@[sort] resultsHandler:^(HKSampleQuery * _Nonnull query, NSArray<__kindof HKSample *> * _Nullable results, NSError * _Nullable error) {
    if (error) {
      reject(@"health_sleep_error", error.localizedDescription, error);
      return;
    }

    NSTimeInterval seconds = 0;
    for (HKCategorySample *sample in results) {
      if (@available(iOS 10.0, *)) {
        if (sample.value != HKCategoryValueSleepAnalysisAsleep && sample.value != HKCategoryValueSleepAnalysisAsleepCore && sample.value != HKCategoryValueSleepAnalysisAsleepDeep && sample.value != HKCategoryValueSleepAnalysisAsleepREM) {
          continue;
        }
      }
      seconds += [sample.endDate timeIntervalSinceDate:sample.startDate];
    }
    resolve(@(seconds / 3600.0));
  }];
  [[self store] executeQuery:query];
}

RCT_REMAP_METHOD(getAverageHeartRate,
                 getAverageHeartRateFrom:(NSString *)startDateString
                 endDate:(NSString *)endDateString
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  HKQuantityType *type = [HKObjectType quantityTypeForIdentifier:HKQuantityTypeIdentifierHeartRate];
  NSDate *startDate = [self dateFromISOString:startDateString];
  NSDate *endDate = [self dateFromISOString:endDateString];
  if (!type || !startDate || !endDate) {
    reject(@"health_bad_arguments", @"Invalid HealthKit heart-rate query arguments.", nil);
    return;
  }

  NSPredicate *predicate = [HKQuery predicateForSamplesWithStartDate:startDate endDate:endDate options:HKQueryOptionStrictStartDate];
  HKStatisticsQuery *query = [[HKStatisticsQuery alloc] initWithQuantityType:type quantitySamplePredicate:predicate options:HKStatisticsOptionDiscreteAverage completionHandler:^(HKStatisticsQuery * _Nonnull query, HKStatistics * _Nullable result, NSError * _Nullable error) {
    if (error) {
      reject(@"health_heart_rate_error", error.localizedDescription, error);
      return;
    }
    HKUnit *unit = [[HKUnit countUnit] unitDividedByUnit:[HKUnit minuteUnit]];
    HKQuantity *quantity = [result averageQuantity];
    resolve(quantity ? @([quantity doubleValueForUnit:unit]) : [NSNull null]);
  }];
  [[self store] executeQuery:query];
}

@end
