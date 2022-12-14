pipeline {
    agent { label 'zowe-agent' }
    environment {
        // z/OSMF Connection Details
        ZOWE_OPT_HOST=credentials('eosHost')
    }
    stages {
        stage('local setup') {
            steps {
                sh 'node --version'
                sh 'npm --version'
                sh 'zowe --version'
                // We need a different version of the Endevor plugin.  
                // So we uninstall it and install the correct one.
                sh 'zowe plugins uninstall @broadcom/endevor-for-zowe-cli'
                sh 'zowe plugins install @broadcom/endevor-for-zowe-cli@6.5.0'
                sh 'zowe plugins list'
                sh 'npm install gulp-cli -g'
                sh 'npm install'

                //Create cics, db2, endevor, fmp, and zosmf profiles, env vars will provide host, user, and password details
                sh 'zowe profiles create cics Jenkins --port 6000 --protocol https --ru false --region-name CICSTRN1 --host dummy --user dummy --password dummy'
                sh 'zowe profiles create endevor Jenkins --port 6032 --protocol https --ru false --host dummy --user dummy --password dummy'
                sh 'zowe profiles create endevor-location Marbles --instance ENDEVOR --env DEV --sys MARBLES --sub MARBLES --ccid JENKXX --comment JENKXX'
                sh 'zowe profiles create zosmf Jenkins --port 1443 --ru false --host dummy --user dummy --password dummy'

            }
        }
        stage('build') {
            steps {
                //ZOWE_OPT_USERNAME & ZOWE_OPT_PASSWORD are used to interact with Endevor 
                withCredentials([usernamePassword(credentialsId: 'eosCreds', usernameVariable: 'ZOWE_OPT_USER', passwordVariable: 'ZOWE_OPT_PASSWORD')]) {
                    sh 'echo build'
                }
            }
        }
        stage('deploy') {
            steps {
                //ZOWE_OPT_USER & ZOWE_OPT_PASSWORD are used to interact with z/OSMF and CICS
                withCredentials([usernamePassword(credentialsId: 'eosCreds', usernameVariable: 'ZOWE_OPT_USER', passwordVariable: 'ZOWE_OPT_PASSWORD')]) {
                    sh 'echo deploy'
                }
            }
        }
        stage('test') {
            steps {
                //ZOWE_OPT_USER & ZOWE_OPT_PASS are used to interact with z/OSMF
                withCredentials([usernamePassword(credentialsId: 'eosCreds', usernameVariable: 'ZOWE_OPT_USER', passwordVariable: 'ZOWE_OPT_PASSWORD')]) {
                    sh 'echo test'
                }
            }
        }
    }

    // post {
    //     always {
    //         publishHTML([allowMissing: false,
    //             alwaysLinkToLastBuild: true,
    //             keepAll: true,
    //             reportDir: 'mochawesome-report',
    //             reportFiles: 'mochawesome.html',
    //             reportName: 'Test Results',
    //             reportTitles: 'Test Report'
    //             ])
    //     }
    // }
}