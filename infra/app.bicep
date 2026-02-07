targetScope = 'resourceGroup'

@secure()
param uploadPassword string

param appName string
param planName string
param storageAccountName string
param containerName string = 'uploads'


resource plan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: planName
  location: resourceGroup().location
  sku: {
    name: 'B1'
    tier: 'Basic'
    capacity: 1
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

resource storage 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: resourceGroup().location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
  }
}

resource uploadsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  name: '${storage.name}/default/${containerName}'
  properties: {
    publicAccess: 'None'
  }
}

var storageKey = storage.listKeys().keys[0].value
var storageConnStr = 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${storageKey};EndpointSuffix=${environment().suffixes.storage}'

resource web 'Microsoft.Web/sites@2022-09-01' = {
  name: appName
  location: resourceGroup().location
  kind: 'app,linux'
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      appSettings: [
        { name: 'AZURE_STORAGE_CONNECTION_STRING', value: storageConnStr }
        { name: 'AZURE_STORAGE_CONTAINER', value: containerName }
        { name: 'UPLOAD_PASSWORD', value: uploadPassword }
        { name: 'SCM_DO_BUILD_DURING_DEPLOYMENT', value: 'true' }
      ]
    }
  }
}
