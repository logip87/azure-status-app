targetScope = 'resourceGroup'

@description('Web App name')
param appName string

@description('App Service Plan name')
param planName string

@description('Storage account name (must be globally unique, 3-24 lowercase letters/numbers)')
param storageAccountName string

@description('Blob container name')
param containerName string = 'uploads'

@description('Log Analytics workspace name')
param logAnalyticsName string

@description('Application Insights name')
param appInsightsName string

@secure()
@description('Upload/delete password used by the app')
param uploadPassword string

@description('Azure region, default to RG location')
param location string = resourceGroup().location

resource plan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: planName
  location: location
  kind: 'linux'
  sku: {
    name: 'B1'
    tier: 'Basic'
    capacity: 1
  }
  properties: {
    reserved: true
  }
}

resource storage 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
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

resource law 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

resource appi 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: law.id
  }
}

var storageKey = listKeys(storage.id, '2023-01-01').keys[0].value
var storageConnStr = 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${storageKey};EndpointSuffix=${environment().suffixes.storage}'

resource web 'Microsoft.Web/sites@2022-09-01' = {
  name: appName
  location: location
  kind: 'app,linux'
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      appSettings: [
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appi.properties.ConnectionString
        }

        {
          name: 'AZURE_STORAGE_CONNECTION_STRING'
          value: storageConnStr
        }
        {
          name: 'AZURE_STORAGE_CONTAINER'
          value: containerName
        }

        {
          name: 'UPLOAD_PASSWORD'
          value: uploadPassword
        }

        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'true'
        }
      ]
    }
  }
}

output appUrl string = 'https://${web.properties.defaultHostName}'
output appInsightsConnectionString string = appi.properties.ConnectionString
output logAnalyticsWorkspaceId string = law.properties.customerId
