# Introduction fflib ApexMocks

Traditional unit testing on the Salesforce platform can be a time consuming task as they haven't a proper mocking framework as developers in Java or C# have. At the time of writing it might be that Salesforce has introduced something like the STUB Api, but this is not sufficient yet.

Salesforce developers are most often used to prepare their unit tests by setting up a lot of data records, inserting and or updating them and by triggering this making sure the dependent components are working correctly.

With the fflib ApexMocks framework which is heavily based on mockito, a leading mocking framework for Java, we are able to write true unit tests in Salesforce by focusing 100% on testing the logic of the component, with no need to worry about inserting data and therefore drastically improve the time of execution.

# Getting started with fflib ApexMocks

To start using the ApexMocks framework, you first need to take a Dependency Injection approach to writing your software. Dependency Injection is one way of achieving a loosely coupled, highly cohesive design for your code.

The preferred way of injection is constructor injection, but setter injection is also allowed.

At it's simplest level all this means is that you pass a given class its dependencies via its constructor. In order to facilitate robust production code and the ability to inject mocks we can settle on this pattern:

> This is an DI example with constructur injection.

```
public with sharing class GambitClass implements IGambitClass {
    private final ICampaignRepository campaignRepository;
    private final IGambitRepository gambitRepository;

    @testvisible
    private ServiceContractService(
        ICampaignRepository campaignRepository,
        IGambitRepository gambitRepository
    ) {
        this.campaignRepository = campaignRepository;
        this.gambitRepository = gambitRepository;
    }

    public ServiceContractService() {
        this(new CampaignRepository(), new GambitRepository());
    }

    public void someMethodDoingOneThing() {
        ...
    }
}
```

> This is the unit test using ApexMocks

```
@IsTest
public with sharing class GambitClassTest {
    @IsTest
    static void handleSupportServiceByAccount_shouldOnlyCreateEntitlement() {
        // Given
        fflib_ApexMocks mocks = new fflib_ApexMocks();
        ICampaignRepository mockedCampaignRepo = (ICampaignRepository) mocks.mock(ICampaignRepository.class);
        IGambitRepository mockedGambitRepo = (IGambitRepository) mocks.mock(
            IGambitRepository.class
        );
        GambitClGambitClass gambitClass = new GambitClass(mockedCampaignRepo, mockedGambitRepo);

        CampaignRecord anCampaignRecord = new CampaignRecordBuilder().build();
        GambitRecord anGambitRecord = new GambitRedcordBuilder().build();

        fflib_ArgumentCaptor campaignsToCapture = fflib_ArgumentCaptor.forClass(List<CampaignRecord>.class);
        fflib_ArgumentCaptor gambitRecordsToCapture = fflib_ArgumentCaptor.forClass(List<GambitRecord>.class);

        mocks.startStubbing();
        mocks.when(mockedCampaignRepo.getCampaigns((Set<Id>) fflib_match.anyObject())).thenReturn(anCampaignRecord);
        mocks.when(mockedGambitRepo.getGambitRecords((Set<Id>) fflib_match.anyObject()))
            .thenReturn(anGambitRecord);
        mocks.stopStubbing();

        // When
        gambitClass.someMethodDoingOneThing();

        // Then
        ((ICampaignRepository) mocks.verify(mockedCampaignRepo, 1))
            .insertCampaignRecords((List<CampaignRecord>) campaignsToCapture.capture());
        List<CampaignRecord> insertedCampaignRecords = (List<CampaignRecord>) campaignsToCapture.getvalue();
        Assert.isTrue(insertedCampaignRecords.isEmpty());

        ((IGambitRepository) mocks.verify(mockedGambitRepo, 1))
            .insertGambitRecords((List<GambitRecord>) gambitRecordsToCapture.capture());
        List<GambitRecord> insertedGambitRecords = (List<GambitRecord>) gambitRecordsToCapture.getvalue();
    }
}
```
